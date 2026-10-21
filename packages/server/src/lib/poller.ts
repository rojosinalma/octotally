import { DEFAULT_SETTINGS, type Settings } from '@octotally/shared';
import type { Db } from '../db';
import { errInfo, log } from '../log';
import { buildDailyDigest, buildRealtimeDigest, dailyDue, dispatchDigest, lastDigestAt } from './digest';
import { getSettings } from './settings';
import type { Syncer } from './sync';

/**
 * setTimeout loop (no setInterval drift): sync → digests → schedule the next run from the
 * settings read *this* cycle, with ±10% jitter and the syncer's backoff. Nothing here throws.
 */
export class Poller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private nextRunAtMs: number | null = null;
  private readonly logger = log('poll');

  constructor(
    private readonly db: Db,
    private readonly syncer: Syncer,
    private readonly now: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  get nextRunAt(): string | null {
    return this.nextRunAtMs ? new Date(this.nextRunAtMs).toISOString() : null;
  }

  /** Starts the loop; the first cycle runs after `initialDelayMs` (default: right away). */
  start(initialDelayMs = 0): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(initialDelayMs);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.nextRunAtMs = null;
  }

  /** One full cycle, also used by POST /api/refresh (fire and forget there). */
  async cycle(): Promise<void> {
    try {
      const outcome = await this.syncer.run();
      if (outcome.skipped === 'running') return;
      const settings = await getSettings(this.db);
      if (outcome.ok && settings.digestRealtime && outcome.newActivity.length) {
        const msg = await buildRealtimeDigest(this.db, outcome.newActivity);
        if (msg) await dispatchDigest(this.db, settings, msg, this.now());
      }
      if (await dailyDue(this.db, settings, this.now())) {
        const since =
          (await lastDigestAt(this.db, 'daily')) ?? new Date(this.now().getTime() - 86_400_000).toISOString();
        const msg = await buildDailyDigest(this.db, settings, since, this.now());
        if (msg) await dispatchDigest(this.db, settings, msg, this.now());
        else this.logger.info('daily digest due but nothing new');
      }
    } catch (err) {
      this.logger.error({ err: errInfo(err) }, 'poll cycle failed');
    }
  }

  private schedule(delayMs: number) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.nextRunAtMs = this.now().getTime() + delayMs;
    this.timer = setTimeout(async () => {
      this.timer = null;
      await this.cycle();
      this.schedule(await this.nextDelayMs());
    }, delayMs);
  }

  /** Settings unreadable (database down): the defaults keep the loop alive until it answers again. */
  private async nextDelayMs(): Promise<number> {
    let settings: Settings;
    try {
      settings = await getSettings(this.db);
    } catch (err) {
      this.logger.error({ err: errInfo(err) }, 'cannot read settings, using defaults for the next delay');
      settings = DEFAULT_SETTINGS;
    }
    const base = this.syncer.nextDelayMin(settings) * 60_000;
    const jitter = (this.random() * 2 - 1) * 0.1 * base;
    return Math.max(1000, Math.round(base + jitter));
  }
}
