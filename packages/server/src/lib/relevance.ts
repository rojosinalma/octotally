import type { Item, Settings } from '@octotally/shared';

/**
 * Pure relevance rules over item snapshots. Adding a rule = one function + one test row
 * in test/relevance.test.ts. The saved views express the same rules as search strings;
 * these helpers exist for digests and counters.
 */

const DAY_MS = 86_400_000;

/** Activity within `settings.activeWindowDays` and not hidden. */
export function isActive(item: Item, settings: Settings, now: Date = new Date()): boolean {
  if (item.hidden !== 'none') return false;
  return now.getTime() - Date.parse(item.lastActivityAt) <= settings.activeWindowDays * DAY_MS;
}

/** Open issue with no linked PR, or open unanswered discussion. Never a PR. */
export function needsPr(item: Item): boolean {
  if (item.hidden !== 'none' || item.state !== 'open') return false;
  if (item.type === 'issue') return item.linkedPrs.length === 0;
  if (item.type === 'discussion') return item.isAnswered !== true;
  return false;
}

/** A muted item comes back when activity newer than the mute point arrives. */
export function shouldAutoUnmute(item: Pick<Item, 'hidden' | 'mutedActivityAt' | 'lastActivityAt'>): boolean {
  if (item.hidden !== 'muted') return false;
  if (!item.mutedActivityAt) return true;
  return Date.parse(item.lastActivityAt) > Date.parse(item.mutedActivityAt);
}

/** True when the remote snapshot carries activity the stored row has not seen. */
export function hasNewActivity(
  stored: Pick<Item, 'lastActivityAt'> | null,
  remoteLastActivityAt: string,
): boolean {
  if (!stored) return false;
  return Date.parse(remoteLastActivityAt) > Date.parse(stored.lastActivityAt);
}

export function countRelevant(items: Item[], settings: Settings, now: Date = new Date()) {
  let active = 0;
  let needs = 0;
  for (const i of items) {
    if (isActive(i, settings, now)) active += 1;
    if (needsPr(i)) needs += 1;
  }
  return { active, needsPr: needs };
}
