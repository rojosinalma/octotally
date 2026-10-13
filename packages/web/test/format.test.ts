import { describe, expect, test } from 'bun:test';
import { activityLine, minutesToUnit, relativeTime, unitToMinutes } from '../src/lib/format';

const now = new Date('2026-10-13T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe('relativeTime', () => {
  test('buckets', () => {
    expect(relativeTime(ago(10_000), now)).toBe('just now');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5m ago');
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe('3h ago');
    expect(relativeTime(ago(2 * 86_400_000), now)).toBe('2d ago');
    expect(relativeTime(ago(45 * 86_400_000), now)).toBe('1mo ago');
    expect(relativeTime(ago(400 * 86_400_000), now)).toBe('1y ago');
  });
  test('future and invalid', () => {
    expect(relativeTime(new Date(now.getTime() + 4 * 60_000).toISOString(), now)).toBe('in 4m');
    expect(relativeTime(null, now)).toBe('never');
    expect(relativeTime('garbage', now)).toBe('unknown');
  });
});

describe('activityLine', () => {
  test('commented vs opened vs updated', () => {
    expect(
      activityLine({ lastActivityBy: 'maziggy', lastActivityAt: ago(7_200_000), commentCount: 3 }, now),
    ).toBe('maziggy commented 2h ago');
    expect(
      activityLine({ lastActivityBy: 'maziggy', lastActivityAt: ago(7_200_000), commentCount: 0 }, now),
    ).toBe('maziggy opened 2h ago');
    expect(
      activityLine({ lastActivityBy: null, lastActivityAt: ago(86_400_000), commentCount: 0 }, now),
    ).toBe('updated 1d ago');
  });
});

describe('duration units', () => {
  test('round-trips', () => {
    expect(minutesToUnit(15)).toEqual({ value: 15, unit: 'min' });
    expect(minutesToUnit(120)).toEqual({ value: 2, unit: 'h' });
    expect(minutesToUnit(1440)).toEqual({ value: 1, unit: 'd' });
    expect(minutesToUnit(90)).toEqual({ value: 90, unit: 'min' });
    expect(unitToMinutes(2, 'h')).toBe(120);
    expect(unitToMinutes(1, 'd')).toBe(1440);
  });
});
