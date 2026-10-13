import type { Activity, Role, Settings, SyncStatus } from '@octotally/shared';
import { desc, eq, lt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { activity as activityTable, items as itemsTable, syncRuns } from '../db/schema';
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

      const runId = this.db.insert(syncRuns).values({ startedAt }).returning({ id: syncRuns.id }).get().id;
      const gh = new GitHubClient(token, this.clientOptions);
      const costBefore = gh.lastRateLimit;
      try {
        const snapshot = await this.fetchSnapshotImpl(gh);
        this.lastRateLimit = gh.lastRateLimit;
        this.lastSyncCost =
          costBefore && gh.lastRateLimit ? Math.max(0, costBefore.remaining - gh.lastRateLimit.remaining) : 0;
        const settings = getSettings(this.db);
        const result = this.persist(snapshot, settings);
        this.failures = 0;
        const counts = { ...snapshot.counts, ...result.counts };
        this.db
          .update(syncRuns)
          .set({
            finishedAt: this.now().toISOString(),
            ok: true,
            githubLogin: snapshot.login,
            rateRemaining: this.lastRateLimit?.remaining ?? null,
            rateResetAt: this.lastRateLimit?.resetAt ?? null,
            counts,
          })
          .where(eq(syncRuns.id, runId))
          .run();
        this.logger.info(
          { login: snapshot.login, ...counts, newActivity: result.newActivity.length },
          'sync ok',
        );
        return { ok: true, newActivity: result.newActivity, counts };
      } catch (err) {
        this.lastRateLimit = gh.lastRateLimit ?? this.lastRateLimit;
        this.failures += 1;
        const message = describeError(err);
        this.db
          .update(syncRuns)
          .set({
            finishedAt: this.now().toISOString(),
            ok: false,
            error: message,
            rateRemaining: this.lastRateLimit?.remaining ?? null,
            rateResetAt: this.lastRateLimit?.resetAt ?? null,
          })
          .where(eq(syncRuns.id, runId))
          .run();
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
  private persist(
    snapshot: Snapshot,
    settings: Settings,
  ): { newActivity: Activity[]; counts: Record<string, number> } {
    const nowIso = this.now().toISOString();
    const newActivity: Activity[] = [];
    let added = 0;
    let updated = 0;
    let unmuted = 0;
    const hadItems = countItems(this.db) > 0;

    this.db.transaction((tx) => {
      for (const remote of snapshot.items) {
        const roles = [...(snapshot.roles.get(remote.id) ?? new Set<Role>())].sort();
        const stored = tx.select().from(itemsTable).where(eq(itemsTable.id, remote.id)).get();
        const { lastEvent, ...fields } = remote;

        if (!stored) {
          tx.insert(itemsTable)
            .values({ ...fields, roles, hidden: 'none', firstSeenAt: nowIso, lastSyncedAt: nowIso })
            .run();
          added += 1;
          if (hadItems) {
            newActivity.push(
              this.addActivity(tx, {
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
        if (act) newActivity.push(this.addActivity(tx, { ...act, itemId: remote.id, seenAt: nowIso }));

        const merged = {
          ...fields,
          roles,
          hidden: stored.hidden,
          hiddenAt: stored.hiddenAt,
          mutedActivityAt: stored.mutedActivityAt,
          lastSyncedAt: nowIso,
        };
        if (
          shouldAutoUnmute({
            hidden: stored.hidden as 'muted',
            mutedActivityAt: stored.mutedActivityAt,
            lastActivityAt: remote.lastActivityAt,
          })
        ) {
          merged.hidden = 'none';
          merged.hiddenAt = null;
          merged.mutedActivityAt = null;
          unmuted += 1;
        }
        tx.update(itemsTable).set(merged).where(eq(itemsTable.id, remote.id)).run();
        updated += 1;
        if (act) this.capActivity(tx, remote.id, settings.activityKeep);
      }
    });
    return { newActivity, counts: { added, updated, unmuted } };
  }

  private addActivity(tx: Tx, a: Omit<Activity, 'id'> & { seenAt: string }): Activity {
    const id = `${a.itemId}:${a.kind}:${a.at}`;
    tx.insert(activityTable)
      .values({ id, ...a })
      .onConflictDoNothing()
      .run();
    return { id, itemId: a.itemId, kind: a.kind, actor: a.actor, summary: a.summary, url: a.url, at: a.at };
  }

  private capActivity(tx: Tx, itemId: string, keep: number) {
    const cutoff = tx
      .select({ at: activityTable.at })
      .from(activityTable)
      .where(eq(activityTable.itemId, itemId))
      .orderBy(desc(activityTable.at))
      .limit(1)
      .offset(keep - 1)
      .get();
    if (!cutoff) return;
    tx.delete(activityTable)
      .where(sql`${activityTable.itemId} = ${itemId} AND ${lt(activityTable.at, cutoff.at)}`)
      .run();
  }

  status(nextSyncAt: string | null): SyncStatus {
    const last = this.db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1).get();
    const lastOkLogin =
      last?.githubLogin ??
      this.db
        .select({ l: syncRuns.githubLogin })
        .from(syncRuns)
        .where(sql`${syncRuns.githubLogin} IS NOT NULL`)
        .orderBy(desc(syncRuns.id))
        .limit(1)
        .get()?.l ??
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
      itemCount: countItems(this.db),
    };
  }

  /** Used by /health and the onboarding state before the first run. */
  noteNoToken(message: string) {
    this.noTokenError = message;
  }
}

type StoredRow = typeof itemsTable.$inferSelect;
/** A db handle or the transaction inside `db.transaction()`. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

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
