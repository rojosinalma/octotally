const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact GitHub-style relative time: "just now", "5m ago", "3h ago", "2d ago", "3mo ago", "in 4m". */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'never';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'unknown';
  const diff = now.getTime() - t;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const fmt = (n: number, unit: string) => (future ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (abs < MINUTE) return future ? 'in a moment' : 'just now';
  if (abs < HOUR) return fmt(Math.floor(abs / MINUTE), 'm');
  if (abs < DAY) return fmt(Math.floor(abs / HOUR), 'h');
  if (abs < 30 * DAY) return fmt(Math.floor(abs / DAY), 'd');
  if (abs < 365 * DAY) return fmt(Math.floor(abs / (30 * DAY)), 'mo');
  return fmt(Math.floor(abs / (365 * DAY)), 'y');
}

/** Long form for titles/tooltips. */
export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** "acme-dev commented 2h ago" / "acme-dev opened 3d ago" / "updated 1d ago". */
export function activityLine(
  item: { lastActivityBy: string | null; lastActivityAt: string; commentCount: number },
  now: Date = new Date(),
): string {
  const when = relativeTime(item.lastActivityAt, now);
  if (!item.lastActivityBy) return `updated ${when}`;
  const verb = item.commentCount > 0 ? 'commented' : 'opened';
  return `${item.lastActivityBy} ${verb} ${when}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Splits minutes into the largest whole unit for a duration input (e.g. 120 → {value: 2, unit: 'h'}). */
export function minutesToUnit(min: number): { value: number; unit: 'min' | 'h' | 'd' } {
  if (min % 1440 === 0 && min >= 1440) return { value: min / 1440, unit: 'd' };
  if (min % 60 === 0 && min >= 60) return { value: min / 60, unit: 'h' };
  return { value: min, unit: 'min' };
}

export function unitToMinutes(value: number, unit: 'min' | 'h' | 'd'): number {
  const factor = unit === 'd' ? 1440 : unit === 'h' ? 60 : 1;
  return Math.round(value * factor);
}
