import { describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS } from '@octotally/shared';
import { getItem, listActivity, listItems, setHidden } from '../src/lib/items';
import { patchSettings } from '../src/lib/settings';
import { Syncer } from '../src/lib/sync';
import { StaticToken } from '../src/lib/token';
import issuesPage from './fixtures/issues-page1.json';
import { fakeGitHub, memDb, must, noSleep } from './helpers';

const ISSUE = 'I_kwDOAbCdEf5xyz001';

function syncer(
  db: ReturnType<typeof memDb>['db'],
  overrides: Record<string, unknown> = {},
  token: string | null = 't',
) {
  return new Syncer({
    db,
    tokens: new StaticToken(token),
    clientOptions: { fetch: fakeGitHub(overrides), sleep: noSleep },
  });
}

/** The issues page with a newer comment on the first issue. */
function withNewComment(at: string, by = 'maintainer') {
  const page = structuredClone(issuesPage);
  const n = page.data.search.nodes[0] as {
    updatedAt: string;
    comments: { totalCount: number; nodes: { author: { login: string }; createdAt: string; url: string }[] };
  };
  n.updatedAt = at;
  n.comments.totalCount += 1;
  n.comments.nodes = [
    {
      author: { login: by },
      createdAt: at,
      url: 'https://github.com/acme/widgets/issues/142#issuecomment-9',
    },
  ];
  return { InvolvedIssues: page };
}

describe('Syncer', () => {
  test('no token → skipped with a clear error, no run recorded', async () => {
    const h = memDb();
    const s = syncer(h.db, {}, null);
    const out = await s.run();
    expect(out).toMatchObject({ ok: false, skipped: 'no_token' });
    expect(out.error).toMatch(/no token/);
    expect(s.status(null)).toMatchObject({
      githubLogin: null,
      lastSyncAt: null,
      itemCount: 0,
    });
    expect(s.status(null).lastError).toMatch(/no token/);
  });

  test('first sync imports items with roles, no activity rows', async () => {
    const h = memDb();
    const s = syncer(h.db);
    const out = await s.run();
    expect(out.ok).toBe(true);
    expect(out.counts).toMatchObject({ added: 4, updated: 0, issues: 2, prs: 1, discussions: 1 });
    const items = listItems(h.db);
    expect(items).toHaveLength(4);
    const issue = must(getItem(h.db, ISSUE));
    expect(issue.roles).toEqual(['author', 'commenter']);
    expect(issue.hidden).toBe('none');
    expect(listActivity(h.db, ISSUE)).toHaveLength(0);
    const st = s.status('2026-10-13T12:15:00.000Z');
    expect(st).toMatchObject({
      githubLogin: 'octocat',
      lastSyncOk: true,
      itemCount: 4,
      githubRateRemaining: 4994,
    });
    expect(st.nextSyncAt).toBe('2026-10-13T12:15:00.000Z');
  });

  test('second sync with a new comment appends activity and preserves local state', async () => {
    const h = memDb();
    await syncer(h.db).run();
    setHidden(h.db, ISSUE, 'done');
    const out = await syncer(h.db, withNewComment('2026-10-13T08:00:00Z')).run();
    expect(out.newActivity).toHaveLength(1);
    expect(out.newActivity[0]).toMatchObject({
      itemId: ISSUE,
      kind: 'comment',
      actor: 'maintainer',
      summary: 'maintainer commented',
    });
    const issue = must(getItem(h.db, ISSUE));
    expect(issue.hidden).toBe('done'); // done is sticky
    expect(issue.lastActivityAt).toBe('2026-10-13T08:00:00.000Z');
    expect(issue.commentCount).toBe(5);
    expect(listActivity(h.db, ISSUE)).toHaveLength(1);
  });

  test('muted item is auto-unmuted by newer activity, not by a re-sync of the same state', async () => {
    const h = memDb();
    await syncer(h.db).run();
    setHidden(h.db, ISSUE, 'muted');
    await syncer(h.db).run();
    expect(must(getItem(h.db, ISSUE)).hidden).toBe('muted');
    const out = await syncer(h.db, withNewComment('2026-10-13T08:00:00Z')).run();
    expect(out.counts.unmuted).toBe(1);
    const issue = must(getItem(h.db, ISSUE));
    expect(issue.hidden).toBe('none');
    expect(issue.mutedActivityAt).toBeNull();
  });

  test('state change produces a state activity', async () => {
    const h = memDb();
    await syncer(h.db).run();
    const page = structuredClone(issuesPage);
    (page.data.search.nodes[0] as { state: string; updatedAt: string }).state = 'CLOSED';
    (page.data.search.nodes[0] as { state: string; updatedAt: string }).updatedAt = '2026-10-13T09:00:00Z';
    const out = await syncer(h.db, { InvolvedIssues: page }).run();
    expect(out.newActivity[0]).toMatchObject({ kind: 'state', summary: 'Closed' });
    expect(must(getItem(h.db, ISSUE)).state).toBe('closed');
  });

  test('activity is capped at settings.activityKeep', async () => {
    const h = memDb();
    patchSettings(h.db, { activityKeep: 2 });
    await syncer(h.db).run();
    for (let i = 1; i <= 4; i += 1) {
      await syncer(h.db, withNewComment(`2026-10-13T0${i}:00:00Z`)).run();
    }
    const acts = listActivity(h.db, ISSUE);
    expect(acts).toHaveLength(2);
    expect(acts[0]?.at).toBe('2026-10-13T04:00:00.000Z');
  });

  test('new item on a later sync yields a "New" activity', async () => {
    const h = memDb();
    await syncer(h.db).run();
    const page = structuredClone(issuesPage);
    const extra = structuredClone(page.data.search.nodes[0]) as { id: string; number: number; title: string };
    extra.id = 'I_new';
    extra.number = 999;
    extra.title = 'Brand new';
    page.data.search.nodes.push(extra as never);
    const out = await syncer(h.db, { InvolvedIssues: page }).run();
    expect(out.counts.added).toBe(1);
    expect(out.newActivity.map((a) => a.summary)).toEqual(['New issue: Brand new']);
  });

  test('coalesces concurrent runs', async () => {
    const h = memDb();
    const s = syncer(h.db);
    const [a, b] = await Promise.all([s.run(), s.run()]);
    expect([a.skipped, b.skipped].filter((x) => x === 'running')).toHaveLength(1);
    expect(listItems(h.db)).toHaveLength(4);
  });

  test('failure increments backoff and records the error; success resets', async () => {
    const h = memDb();
    const bad = new Syncer({
      db: h.db,
      tokens: new StaticToken('t'),
      clientOptions: {
        fetch: (async () => new Response('', { status: 401 })) as unknown as typeof fetch,
        sleep: noSleep,
      },
    });
    const out = await bad.run();
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/rejected the token/);
    expect(bad.failureCount).toBe(1);
    expect(bad.nextDelayMin({ ...DEFAULT_SETTINGS, pollIntervalMin: 15, backoffMaxMin: 120 })).toBe(30);
    await bad.run();
    expect(bad.nextDelayMin({ ...DEFAULT_SETTINGS, pollIntervalMin: 15, backoffMaxMin: 50 })).toBe(50);
    expect(bad.status(null)).toMatchObject({ lastSyncOk: false });
    expect(bad.status(null).lastError).toMatch(/rejected the token/);

    const good = syncer(h.db);
    await good.run();
    expect(good.failureCount).toBe(0);
    expect(good.nextDelayMin(DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS.pollIntervalMin);
  });
});
