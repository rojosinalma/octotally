import { describe, expect, test } from 'bun:test';
import {
  applySearch,
  BUILTIN_VIEWS,
  DEFAULT_SETTINGS,
  type Item,
  matchesItem,
  parseSearch,
  substituteSettings,
  tokenize,
  type View,
} from '../src';

const NOW = new Date('2026-10-13T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function item(over: Partial<Item> = {}): Item {
  return {
    id: 'I_1',
    type: 'issue',
    number: 1,
    title: 'Energy stats wrong after restart',
    url: 'https://github.com/maziggy/bambuddy/issues/1',
    repo: 'maziggy/bambuddy',
    owner: 'maziggy',
    state: 'open',
    isDraft: false,
    author: 'rojosinalma',
    labels: ['bug'],
    assignees: [],
    roles: ['author'],
    commentCount: 3,
    linkedPrs: [],
    isAnswered: null,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(2),
    lastActivityAt: daysAgo(2),
    lastActivityBy: 'maziggy',
    hidden: 'none',
    hiddenAt: null,
    mutedActivityAt: null,
    firstSeenAt: daysAgo(40),
    lastSyncedAt: NOW.toISOString(),
    ...over,
  };
}

describe('tokenize', () => {
  test('splits on whitespace and honours quotes', () => {
    expect(tokenize('is:open label:"help wanted" "exact phrase" -repo:a/b')).toEqual([
      'is:open',
      'label:help wanted',
      'exact phrase',
      '-repo:a/b',
    ]);
  });
});

describe('parseSearch', () => {
  test('types, states and negation', () => {
    const p = parseSearch('is:open -is:pr type:discussion', { now: NOW });
    expect([...p.states]).toEqual(['open']);
    expect([...p.notTypes]).toEqual(['pr']);
    expect([...p.types]).toEqual(['discussion']);
  });

  test('relative and absolute dates', () => {
    const p = parseSearch('updated:>14d created:2026-01-01..2026-02-01', { now: NOW });
    expect(p.updated[0]).toMatchObject({ op: '>', from: daysAgo(14) });
    expect(p.created[0]).toMatchObject({ op: '..', from: '2026-01-01T00:00:00.000Z' });
  });

  test('@me resolves to the login', () => {
    const p = parseSearch('author:@me', { me: 'RojoSinAlma' });
    expect([...p.authors]).toEqual(['rojosinalma']);
  });

  test('hidden defaults to none, unknown tokens are reported', () => {
    const p = parseSearch('frobnicate:yes foo');
    expect(p.hidden).toBe('none');
    expect(p.unknown).toEqual(['frobnicate:yes']);
    expect(p.text).toEqual(['foo']);
  });

  test('linked and no: qualifiers', () => {
    expect(parseSearch('-linked:pr').linkedPr).toBe(false);
    expect(parseSearch('linked:pr').linkedPr).toBe(true);
    expect(parseSearch('no:linked').linkedPr).toBe(false);
    expect(parseSearch('no:label').noLabel).toBe(true);
  });
});

describe('matchesItem', () => {
  const open = item();
  const merged = item({
    id: 'PR_1',
    type: 'pr',
    state: 'merged',
    updatedAt: daysAgo(60),
    lastActivityAt: daysAgo(60),
  });
  const withPr = item({
    id: 'I_2',
    linkedPrs: [
      {
        number: 9,
        url: 'https://github.com/maziggy/bambuddy/pull/9',
        state: 'open',
        repo: 'maziggy/bambuddy',
      },
    ],
  });
  const muted = item({ id: 'I_3', hidden: 'muted', hiddenAt: daysAgo(1), mutedActivityAt: daysAgo(2) });
  const discussion = item({ id: 'D_1', type: 'discussion', isAnswered: false, roles: ['commenter'] });

  test('active window', () => {
    const p = parseSearch('updated:>30d', { now: NOW });
    expect(matchesItem(p, open)).toBe(true);
    expect(matchesItem(p, merged)).toBe(false);
  });

  test('needs PR excludes issues with linked PRs and PRs themselves', () => {
    const p = parseSearch('is:open -is:pr -linked:pr', { now: NOW });
    expect(matchesItem(p, open)).toBe(true);
    expect(matchesItem(p, withPr)).toBe(false);
    expect(matchesItem(p, item({ type: 'pr' }))).toBe(false);
    expect(matchesItem(p, discussion)).toBe(true);
  });

  test('hidden handling', () => {
    expect(matchesItem(parseSearch(''), muted)).toBe(false);
    expect(matchesItem(parseSearch('hidden:muted'), muted)).toBe(true);
    expect(matchesItem(parseSearch('hidden:any'), muted)).toBe(true);
    expect(matchesItem(parseSearch('hidden:any'), open)).toBe(true);
    expect(matchesItem(parseSearch('hidden:hidden'), muted)).toBe(true);
    expect(matchesItem(parseSearch('hidden:hidden'), open)).toBe(false);
  });

  test('roles, labels, repo, text', () => {
    expect(matchesItem(parseSearch('role:commenter'), discussion)).toBe(true);
    expect(matchesItem(parseSearch('role:commenter'), open)).toBe(false);
    expect(matchesItem(parseSearch('label:bug repo:maziggy/bambuddy energy'), open)).toBe(true);
    expect(matchesItem(parseSearch('-label:bug'), open)).toBe(false);
    expect(matchesItem(parseSearch('org:maziggy is:unanswered'), discussion)).toBe(true);
  });
});

describe('views and settings substitution', () => {
  test('built-in Active view substitutes the window', () => {
    const q = substituteSettings((BUILTIN_VIEWS.find((v) => v.id === 'active') as View).query, {
      ...DEFAULT_SETTINGS,
      activeWindowDays: 7,
    });
    expect(q).toBe('updated:>7d hidden:none');
  });

  test('applySearch filters and sorts', () => {
    const a = item({ id: 'a', lastActivityAt: daysAgo(5) });
    const b = item({ id: 'b', lastActivityAt: daysAgo(1) });
    const c = item({ id: 'c', lastActivityAt: daysAgo(90) });
    const out = applySearch([a, b, c], 'updated:>{activeWindowDays}d', {
      now: NOW,
      settings: DEFAULT_SETTINGS,
    });
    expect(out.map((i) => i.id)).toEqual(['b', 'a']);
    expect(applySearch([a, b], 'sort:updated-asc', { now: NOW }).map((i) => i.id)).toEqual(['a', 'b']);
  });
});
