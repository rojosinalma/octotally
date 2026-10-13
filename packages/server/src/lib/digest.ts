import type { Activity, Item, Settings } from '@octotally/shared';
import { and, desc, eq, gte } from 'drizzle-orm';
import type { Db } from '../db';
import { digests as digestsTable } from '../db/schema';
import { errInfo, log } from '../log';
import { listActivitySince, listItems } from './items';
import { type Notifier, notifiers } from './notifiers';
import { countRelevant } from './relevance';

export type DigestKind = 'daily' | 'realtime' | 'test';

export interface DigestMessage {
  kind: DigestKind;
  title: string;
  /** One line per entry; notifiers chunk as their transport needs. */
  lines: string[];
  footer?: string;
}

/** Only the fields that identify an activity for de-duplication. */
export function hashPayload(payload: unknown): string {
  return new Bun.CryptoHasher('sha256').update(JSON.stringify(payload)).digest('hex');
}

function label(item: Pick<Item, 'repo' | 'number' | 'title' | 'type'>): string {
  const t = item.type === 'pr' ? 'PR' : item.type === 'discussion' ? 'discussion' : 'issue';
  return `${item.repo}#${item.number} (${t}) — ${item.title}`;
}

/** Groups activity by item: `repo#n — title` then one indented line per event. */
export function formatActivity(items: Map<string, Item>, activity: Activity[]): string[] {
  const byItem = new Map<string, Activity[]>();
  for (const a of activity) {
    const list = byItem.get(a.itemId) ?? [];
    list.push(a);
    byItem.set(a.itemId, list);
  }
  const lines: string[] = [];
  for (const [itemId, events] of byItem) {
    const item = items.get(itemId);
    if (!item) continue;
    lines.push(`**[${label(item)}](${item.url})**`);
    for (const e of events.sort((x, y) => Date.parse(x.at) - Date.parse(y.at))) {
      const when = e.at.slice(0, 16).replace('T', ' ');
      lines.push(`  · ${when} ${e.summary}${e.url ? ` ([link](${e.url}))` : ''}`);
    }
  }
  return lines;
}

/** Everything noticed since `since` (ISO, by seenAt) plus the active / needs-PR counters. `null` when quiet. */
export function buildDailyDigest(
  db: Db,
  settings: Settings,
  since: string,
  now = new Date(),
): DigestMessage | null {
  const activity = listActivitySince(db, since);
  if (activity.length === 0) return null;
  const items = new Map(listItems(db).map((i) => [i.id, i] as const));
  const visible = activity.filter((a) => items.get(a.itemId)?.hidden !== 'done');
  if (visible.length === 0) return null;
  const counts = countRelevant([...items.values()], settings, now);
  return {
    kind: 'daily',
    title: `Octotally daily digest — ${visible.length} new event${visible.length === 1 ? '' : 's'}`,
    lines: formatActivity(items, visible),
    footer: `${counts.active} active · ${counts.needsPr} need a PR`,
  };
}

/** Right after a sync: the activity that sync produced, as one message. `null` when nothing. */
export function buildRealtimeDigest(db: Db, newActivity: Activity[]): DigestMessage | null {
  if (newActivity.length === 0) return null;
  const items = new Map(listItems(db).map((i) => [i.id, i] as const));
  const visible = newActivity.filter((a) => items.get(a.itemId)?.hidden !== 'done');
  if (visible.length === 0) return null;
  return {
    kind: 'realtime',
    title: `Octotally — ${visible.length} new event${visible.length === 1 ? '' : 's'}`,
    lines: formatActivity(items, visible),
  };
}

export function lastDigestAt(db: Db, kind: DigestKind): string | null {
  return (
    db
      .select({ sentAt: digestsTable.sentAt })
      .from(digestsTable)
      .where(eq(digestsTable.kind, kind))
      .orderBy(desc(digestsTable.sentAt))
      .limit(1)
      .get()?.sentAt ?? null
  );
}

function alreadySent(db: Db, hash: string, since: string): boolean {
  return (
    db
      .select({ id: digestsTable.id })
      .from(digestsTable)
      .where(and(eq(digestsTable.payloadHash, hash), gte(digestsTable.sentAt, since)))
      .limit(1)
      .get() !== undefined
  );
}

export function configuredNotifiers(settings: Settings): Notifier[] {
  return Object.values(notifiers).filter((n) => n.configured(settings));
}

/**
 * Sends to every configured notifier unless the same payload went out in the last 48h.
 * Notifier failures are logged, never thrown — the poll must not depend on Discord.
 */
export async function dispatchDigest(
  db: Db,
  settings: Settings,
  message: DigestMessage,
  now = new Date(),
): Promise<{ sent: string[]; skipped: boolean }> {
  const logger = log('digest');
  const targets = configuredNotifiers(settings);
  if (targets.length === 0) {
    logger.debug({ kind: message.kind }, 'no notifier configured, digest dropped');
    return { sent: [], skipped: true };
  }
  const hash = hashPayload({ kind: message.kind, lines: message.lines });
  const window = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  if (alreadySent(db, hash, window)) {
    logger.info({ kind: message.kind }, 'identical digest already sent, skipped');
    return { sent: [], skipped: true };
  }
  const sent: string[] = [];
  for (const n of targets) {
    try {
      await n.send(message, settings);
      db.insert(digestsTable)
        .values({ sentAt: now.toISOString(), kind: message.kind, notifier: n.name, payloadHash: hash })
        .run();
      sent.push(n.name);
      logger.info({ kind: message.kind, notifier: n.name, lines: message.lines.length }, 'digest sent');
    } catch (err) {
      logger.error({ kind: message.kind, notifier: n.name, err: errInfo(err) }, 'notifier failed');
    }
  }
  return { sent, skipped: false };
}

/** Local calendar date and hour in `timezone`; falls back to UTC on an invalid zone. */
export function localClock(now: Date, timezone: string): { date: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return localClock(now, 'UTC');
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

/** The daily digest is due once per local day, at or after `digestHour`. */
export function dailyDue(db: Db, settings: Settings, now = new Date()): boolean {
  if (!settings.digestDaily) return false;
  const { date, hour } = localClock(now, settings.timezone);
  if (hour < settings.digestHour) return false;
  const last = lastDigestAt(db, 'daily');
  if (!last) return true;
  return localClock(new Date(last), settings.timezone).date !== date;
}
