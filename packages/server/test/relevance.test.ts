import { describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS } from '@octotally/shared';
import { countRelevant, hasNewActivity, isActive, needsPr, shouldAutoUnmute } from '../src/lib/relevance';
import { daysAgo, item, NOW } from './helpers';

const S = { ...DEFAULT_SETTINGS, activeWindowDays: 30 };

describe('isActive', () => {
  const rows: [string, Parameters<typeof item>[0], boolean][] = [
    ['activity yesterday', { lastActivityAt: daysAgo(1) }, true],
    ['activity exactly at the window edge', { lastActivityAt: daysAgo(30) }, true],
    ['activity 31 days ago', { lastActivityAt: daysAgo(31) }, false],
    ['recent but muted', { lastActivityAt: daysAgo(1), hidden: 'muted' }, false],
    ['recent but done', { lastActivityAt: daysAgo(1), hidden: 'done' }, false],
    ['closed but recent still counts as active', { lastActivityAt: daysAgo(1), state: 'closed' }, true],
  ];
  for (const [name, over, expected] of rows) {
    test(name, () => expect(isActive(item(over), S, NOW)).toBe(expected));
  }
  test('honours a different window from settings', () => {
    expect(isActive(item({ lastActivityAt: daysAgo(10) }), { ...S, activeWindowDays: 7 }, NOW)).toBe(false);
  });
});

describe('needsPr', () => {
  const rows: [string, Parameters<typeof item>[0], boolean][] = [
    ['open issue, no linked PR', {}, true],
    [
      'open issue with a linked PR',
      { linkedPrs: [{ number: 2, url: 'https://github.com/a/b/pull/2', state: 'open', repo: 'a/b' }] },
      false,
    ],
    ['closed issue', { state: 'closed' }, false],
    ['open PR never needs a PR', { type: 'pr' }, false],
    ['open unanswered discussion', { type: 'discussion', isAnswered: false }, true],
    ['open answered discussion', { type: 'discussion', isAnswered: true }, false],
    ['closed discussion', { type: 'discussion', state: 'closed', isAnswered: false }, false],
    ['hidden issue', { hidden: 'done' }, false],
  ];
  for (const [name, over, expected] of rows) {
    test(name, () => expect(needsPr(item(over))).toBe(expected));
  }
});

describe('shouldAutoUnmute', () => {
  const rows: [string, Parameters<typeof item>[0], boolean][] = [
    ['not muted', { hidden: 'none' }, false],
    [
      'done never auto-clears',
      { hidden: 'done', mutedActivityAt: daysAgo(5), lastActivityAt: daysAgo(1) },
      false,
    ],
    [
      'muted, no newer activity',
      { hidden: 'muted', mutedActivityAt: daysAgo(1), lastActivityAt: daysAgo(1) },
      false,
    ],
    [
      'muted, newer activity',
      { hidden: 'muted', mutedActivityAt: daysAgo(3), lastActivityAt: daysAgo(1) },
      true,
    ],
    ['muted without a recorded point (legacy row)', { hidden: 'muted', mutedActivityAt: null }, true],
  ];
  for (const [name, over, expected] of rows) {
    test(name, () => expect(shouldAutoUnmute(item(over))).toBe(expected));
  }
});

describe('hasNewActivity', () => {
  test('first sight is not activity', () => expect(hasNewActivity(null, daysAgo(0))).toBe(false));
  test('same timestamp is not new', () =>
    expect(hasNewActivity({ lastActivityAt: daysAgo(1) }, daysAgo(1))).toBe(false));
  test('newer timestamp is new', () =>
    expect(hasNewActivity({ lastActivityAt: daysAgo(2) }, daysAgo(1))).toBe(true));
});

test('countRelevant sums both rules', () => {
  const items = [
    item(),
    item({ id: 'b', lastActivityAt: daysAgo(60) }),
    item({ id: 'c', type: 'pr', lastActivityAt: daysAgo(1) }),
  ];
  expect(countRelevant(items, S, NOW)).toEqual({ active: 2, needsPr: 2 });
});
