import type { Activity, Role, Settings, SyncStatus } from '@octotally/shared';
import { and, desc, eq, isNotNull, lt } from 'drizzle-orm';
import type { Db, schema } from '../db';
import { errInfo, log } from '../log';
import { GitHubClient, GitHubError, type GraphQLOptions, type RateLimit } from './github/client';
import { fetchSnapshot, type Snapshot } from './github/fetch';
import type { RemoteItem } from './github/map';
import { countItems } from './items';
import { hasNewActivity, shouldAutoUnmute } from './relevance';
import { getSettings } from './settings';
import type { TokenSource } from './token';

export interface SyncOutcome {
  ok: boolean;
  /** Why nothing ran (the poller treats skips as "try again at the next slot"). */
  skipped?: 'running' | 'no_token' | 'rate_budget';
  error?: string;
  newActivity: Activity[];
  counts: Record<string, number>;
}

export interface SyncerOptions {
  db: Db;
  tokens: TokenSource;
  /** Test seam: build the client against a fake fetch. */
  clientOptions?: GraphQLOptions;
  fetchSnapshot?: (gh: GitHubClient) => Promise<Snapshot>;
  now?: () => Date;
}

/** Runs one sync at a time; everything the poller and /api/status need to know lives here. */
export class Syncer {
  private running = false;
  private failures = 0;
  private lastRateLimit: RateLimit | null = null;
  private lastSyncCost = 0;
  private noTokenError: string | null = null;
  private readonly logger = log('poll');
  private readonly db: Db;
  private readonly tokens: TokenSource;
  private readonly clientOptions: GraphQLOptions;
  private readonly fetchSnapshotImpl: (gh: GitHubClient) => Promise<Snapshot>;
  private readonly now: () => Date;

  constructor(opts: SyncerOptions) {
    this.db = opts.db;
    this.tokens = opts.tokens;
    this.clientOptions = opts.clientOptions ?? {};
    this.fetchSnapshotImpl = opts.fetchSnapshot ?? fetchSnapshot;
    this.now = opts.now ?? (() => new Date());
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Consecutive failures, for the poller's backoff. */
  get failureCount(): number {
    return this.failures;
  }

  get rateLimit(): RateLimit | null {
    return this.lastRateLimit;
  }

  /** Minutes until the next poll: the plain interval, or exponential backoff after failures. */
  nextDelayMin(settings: Settings): number {
    if (this.failures === 0) return settings.pollIntervalMin;
    return Math.min(settings.pollIntervalMin * 2 ** this.failures, settings.backoffMaxMin);
  }

  async run(): Promise<SyncOutcome> {
    if (this.running) {
      this.logger.info('sync already running, coalescing');
      return { ok: true, skipped: 'running', newActivity: [], counts: {} };
    }
    this.running = true;
    const startedAt = this.now().toISOString();
    try {
      const token = await this.tokens.getToken();
      if (!token) {
        this.noTokenError = `${this.tokens.describe()}: add a GitHub token to start syncing`;
        this.logger.warn({ source: this.tokens.describe() }, 'no token, sync skipped');
        return { ok: false, skipped: 'no_token', error: this.noTokenError, newActivity: [], counts: {} };
      }
      this.noTokenError = null;
      if (this.rateBudgetExceeded()) {
        const msg = `GitHub rate limit low (${this.lastRateLimit?.remaining} left, resets ${this.lastRateLimit?.resetAt}); sync skipped`;
        this.logger.warn(msg);
        return { ok: false, skipped: 'rate_budget', error: msg, newActivity: [], counts: {} };
      }

      const syncRuns = this.db.t.syncRuns;
      const [run] = await this.db.orm.insert(syncRuns).values({ startedAt }).returning({ id: syncRuns.id });
      if (!run) throw new Error('sync_runs insert returned no id');
      const runId = run.id;
      const gh = new GitHubClient(token, this.clientOptions);
      const costBefore = gh.lastRateLimit;
      try {
        const snapshot = await this.fetchSnapshotImpl(gh);
        this.lastRateLimit = gh.lastRateLimit;
        this.lastSyncCost =
          costBefore && gh.lastRateLimit ? Math.max(0, costBefore.remaining - gh.lastRateLimit.remaining) : 0;
        const settings = await getSettings(this.db);
        const result = await this.persist(snapshot, settings);
        this.failures = 0;
        const counts = { ...snapshot.counts, ...result.counts };
        await this.db.orm
          .update(syncRuns)
          .set({
            finishedAt: this.now().toISOString(),
            ok: true,
            githubLogin: snapshot.login,
            rateRemaining: this.lastRateLimit?.remaining ?? null,
            rateResetAt: this.lastRateLimit?.resetAt ?? null,
            counts,
          })
          .where(eq(syncRuns.id, runId));
        this.logger.info(
          { login: snapshot.login, ...counts, newActivity: result.newActivity.length },
          'sync ok',
        );
        return { ok: true, newActivity: result.newActivity, counts };
      } catch (err) {
        this.lastRateLimit = gh.lastRateLimit ?? this.lastRateLimit;
        this.failures += 1;
        const message = describeError(err);
        await this.db.orm
          .update(syncRuns)
          .set({
            finishedAt: this.now().toISOString(),
            ok: false,
            error: message,
            rateRemaining: this.lastRateLimit?.remaining ?? null,
            rateResetAt: this.lastRateLimit?.resetAt ?? null,
          })
          .where(eq(syncRuns.id, runId));
        this.logger.error({ err: errInfo(err), failures: this.failures }, 'sync failed');
        return { ok: false, error: message, newActivity: [], counts: {} };
      }
    } finally {
      this.running = false;
    }
  }

  /** Skip when the previous sync's measured cost would not fit in what is left before the reset. */
  private rateBudgetExceeded(): boolean {
    const r = this.lastRateLimit;
    if (!r || this.lastSyncCost === 0) return false;
    if (Date.parse(r.resetAt) <= this.now().getTime()) return false;
    return r.remaining < this.lastSyncCost;
  }

  /** Writes a snapshot in one transaction; returns the activity rows added. */
  private async persist(
    snapshot: Snapshot,
    settings: Settings,
  ): Promise<{ newActivity: Activity[]; counts: Record<string, number> }> {
    const nowIso = this.now().toISOString();
    const newActivity: Activity[] = [];
    let added = 0;
    let updated = 0;
    let unmuted = 0;
    const hadItems = (await countItems(this.db)) > 0;

    await this.db.transaction(async (tx) => {
      const itemsTable = tx.t.items;
      for (const remote of snapshot.items) {
        const roles = [...(snapshot.roles.get(remote.id) ?? new Set<Role>())].sort();
        const [stored] = await tx.orm.select().from(itemsTable).where(eq(itemsTable.id, remote.id)).limit(1);
        const { lastEvent, ...fields } = remote;

        if (!stored) {
          await tx.orm
            .insert(itemsTable)
            .values({ ...fields, roles, hidden: 'none', firstSeenAt: nowIso, lastSyncedAt: nowIso });
          added += 1;
          if (hadItems) {
            newActivity.push(
              await this.addActivity(tx, {
                itemId: remote.id,
                kind: 'other',
                actor: remote.lastActivityBy,
                summary: `New ${remote.type === 'pr' ? 'pull request' : remote.type}: ${remote.title}`,
                url: remote.url,
                at: remote.lastActivityAt,
                seenAt: nowIso,
              }),
            );
          }
          continue;
        }

        const act = detectActivity(stored, remote);
        if (act) newActivity.push(await this.addActivity(tx, { ...act, itemId: remote.id, seenAt: nowIso }));

        // Local state (hidden, hiddenAt, mutedActivityAt) is only written by an auto-unmute, and then only
        // while the row is still muted: a mute/done the user sets during the sync is never overwritten.
        await tx.orm
          .update(itemsTable)
          .set({ ...fields, roles, lastSyncedAt: nowIso })
          .where(eq(itemsTable.id, remote.id));
        if (
          shouldAutoUnmute({
            hidden: stored.hidden as 'muted',
            mutedActivityAt: stored.mutedActivityAt,
            lastActivityAt: remote.lastActivityAt,
          })
        ) {
          await tx.orm
            .update(itemsTable)
            .set({ hidden: 'none', hiddenAt: null, mutedActivityAt: null })
            .where(and(eq(itemsTable.id, remote.id), eq(itemsTable.hidden, 'muted')));
          unmuted += 1;
        }
        updated += 1;
        if (act) await this.capActivity(tx, remote.id, settings.activityKeep);
      }
    });
    return { newActivity, counts: { added, updated, unmuted } };
  }

  private async addActivity(tx: Db, a: Omit<Activity, 'id'> & { seenAt: string }): Promise<Activity> {
    const id = `${a.itemId}:${a.kind}:${a.at}`;
    await tx.orm
      .insert(tx.t.activity)
      .values({ id, ...a })
      .onConflictDoNothing();
    return { id, itemId: a.itemId, kind: a.kind, actor: a.actor, summary: a.summary, url: a.url, at: a.at };
  }

  private async capActivity(tx: Db, itemId: string, keep: number) {
    const activityTable = tx.t.activity;
    const [cutoff] = await tx.orm
      .select({ at: activityTable.at })
      .from(activityTable)
      .where(eq(activityTable.itemId, itemId))
      .orderBy(desc(activityTable.at))
      .limit(1)
      .offset(keep - 1);
    if (!cutoff) return;
    await tx.orm
      .delete(activityTable)
      .where(and(eq(activityTable.itemId, itemId), lt(activityTable.at, cutoff.at)));
  }

  async status(nextSyncAt: string | null): Promise<SyncStatus> {
    const syncRuns = this.db.t.syncRuns;
    const [last] = await this.db.orm.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1);
    const lastOkLogin =
      last?.githubLogin ??
      (
        await this.db.orm
          .select({ l: syncRuns.githubLogin })
          .from(syncRuns)
          .where(isNotNull(syncRuns.githubLogin))
          .orderBy(desc(syncRuns.id))
          .limit(1)
      )[0]?.l ??
      null;
    return {
      lastSyncAt: last?.finishedAt ?? null,
      lastSyncOk: last?.ok ?? null,
      lastError: this.noTokenError ?? last?.error ?? null,
      nextSyncAt: this.noTokenError ? null : nextSyncAt,
      syncing: this.running,
      githubLogin: lastOkLogin,
      githubRateRemaining: this.lastRateLimit?.remaining ?? last?.rateRemaining ?? null,
      githubRateResetAt: this.lastRateLimit?.resetAt ?? last?.rateResetAt ?? null,
      itemCount: await countItems(this.db),
    };
  }

  /** Used by /health and the onboarding state before the first run. */
  noteNoToken(message: string) {
    this.noTokenError = message;
  }
}

type StoredRow = typeof schema.items.$inferSelect;

/** Which activity, if any, the new snapshot carries for a known item. */
export function detectActivity(
  stored: Pick<StoredRow, 'state' | 'lastActivityAt' | 'title'>,
  remote: RemoteItem,
): Omit<Activity, 'id' | 'itemId'> | null {
  if (stored.state !== remote.state) {
    const verb = remote.state === 'merged' ? 'Merged' : remote.state === 'closed' ? 'Closed' : 'Reopened';
    return {
      kind: 'state',
      actor: remote.lastActivityBy,
      summary: verb,
      url: remote.url,
      at: remote.updatedAt,
    };
  }
  if (!hasNewActivity(stored, remote.lastActivityAt)) return null;
  const ev = remote.lastEvent;
  if (ev && Date.parse(ev.at) > Date.parse(stored.lastActivityAt)) {
    const who = ev.actor ?? 'someone';
    const what = ev.kind === 'review' ? 'reviewed' : 'commented';
    return { kind: ev.kind, actor: ev.actor, summary: `${who} ${what}`, url: ev.url, at: ev.at };
  }
  return {
    kind: 'edit',
    actor: remote.lastActivityBy,
    summary: 'Updated',
    url: remote.url,
    at: remote.updatedAt,
  };
}

export function describeError(err: unknown): string {
  if (err instanceof GitHubError) {
    switch (err.kind) {
      case 'auth':
        return `GitHub rejected the token: ${err.message}`;
      case 'rate_limit':
        return `GitHub rate limit: ${err.message}`;
      case 'schema':
        return err.message;
      default:
        return `GitHub error: ${err.message}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}
