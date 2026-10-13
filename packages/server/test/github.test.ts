import { describe, expect, test } from 'bun:test';
import { AuthError, GitHubClient, RateLimitError, UpstreamError } from '../src/lib/github/client';
import { fetchSnapshot } from '../src/lib/github/fetch';
import { mapIssue, mapPullRequest } from '../src/lib/github/map';
import { IssueNode, PullRequestNode } from '../src/lib/github/schema';
import issuesPage from './fixtures/issues-page1.json';
import { type FakeCall, fakeGitHub, must, noSleep } from './helpers';

const client = (fetchImpl: typeof fetch) =>
  new GitHubClient('t0ken', { fetch: fetchImpl, sleep: noSleep, maxRetries: 2 });

describe('GitHubClient', () => {
  test('sends bearer + UA and records the rate limit', async () => {
    let seen: Record<string, string> = {};
    const f = (async (_u: string, init: RequestInit) => {
      seen = Object.fromEntries(new Headers(init.headers).entries());
      return new Response(
        JSON.stringify({
          data: {
            viewer: { login: 'x' },
            rateLimit: { cost: 1, remaining: 42, limit: 5000, resetAt: '2026-10-13T13:00:00Z' },
          },
        }),
      );
    }) as unknown as typeof fetch;
    const gh = client(f);
    const r = await gh.query('viewer', 'query Viewer { viewer { login } }');
    expect(seen.authorization).toBe('bearer t0ken');
    expect(seen['user-agent']).toMatch(/^octotally\//);
    expect(r.rateLimit?.remaining).toBe(42);
    expect(gh.lastRateLimit?.remaining).toBe(42);
  });

  test('401 → AuthError', async () => {
    const f = (async () => new Response('', { status: 401 })) as unknown as typeof fetch;
    await expect(client(f).query('v', 'query V { x }')).rejects.toBeInstanceOf(AuthError);
  });

  test('403 with remaining 0 → RateLimitError with resetAt', async () => {
    const f = (async () =>
      new Response('', {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' },
      })) as unknown as typeof fetch;
    const err = await client(f)
      .query('v', 'query V { x }')
      .catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.resetAt).toBe('2027-01-15T08:00:00.000Z');
  });

  test('retries 502 then succeeds', async () => {
    let n = 0;
    const f = (async () => {
      n += 1;
      if (n < 3) return new Response('bad gateway', { status: 502 });
      return new Response(
        JSON.stringify({
          data: { ok: true, rateLimit: { cost: 1, remaining: 1, limit: 5000, resetAt: 'x' } },
        }),
      );
    }) as unknown as typeof fetch;
    const r = await client(f).query('v', 'query V { x }');
    expect(n).toBe(3);
    expect(r.data).toMatchObject({ ok: true });
  });

  test('secondary rate limit honours Retry-After then gives up', async () => {
    const waits: number[] = [];
    const f = (async () =>
      new Response('', { status: 429, headers: { 'retry-after': '2' } })) as unknown as typeof fetch;
    const gh = new GitHubClient('t', { fetch: f, maxRetries: 1, sleep: async (ms) => void waits.push(ms) });
    await expect(gh.query('v', 'query V { x }')).rejects.toBeInstanceOf(RateLimitError);
    expect(waits).toEqual([2000]);
  });

  test('500 → UpstreamError, GraphQL errors without data → UpstreamError', async () => {
    const f500 = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    await expect(client(f500).query('v', 'query V { x }')).rejects.toBeInstanceOf(UpstreamError);
    const fErr = (async () =>
      new Response(JSON.stringify({ errors: [{ message: 'boom' }] }))) as unknown as typeof fetch;
    await expect(client(fErr).query('v', 'query V { x }')).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('schema + map', () => {
  const nodes = issuesPage.data.search.nodes;
  test('issue node validates and maps', () => {
    const n = IssueNode.parse(nodes[0]);
    const it = mapIssue(n);
    expect(it).toMatchObject({
      type: 'issue',
      state: 'open',
      repo: 'acme/widgets',
      owner: 'acme',
      labels: ['bug', 'help wanted'],
    });
    expect(it.lastActivityBy).toBe('maintainer');
    expect(it.lastEvent?.kind).toBe('comment');
  });
  test('closed issue with merged linked PR', () => {
    const it = mapIssue(IssueNode.parse(nodes[1]));
    expect(it.state).toBe('closed');
    expect(it.linkedPrs).toEqual([
      { number: 8, url: 'https://github.com/acme/widgets/pull/8', state: 'merged', repo: 'acme/widgets' },
    ]);
    expect(it.assignees).toEqual(['octocat']);
  });
  test('PR with null author and null labels maps to ghost / []', () => {
    const it = mapPullRequest(PullRequestNode.parse(nodes[2]));
    expect(it).toMatchObject({
      type: 'pr',
      state: 'merged',
      author: 'ghost',
      labels: [],
      lastActivityBy: 'reviewer1',
    });
    expect(it.lastEvent?.kind).toBe('review');
  });
  test('a bot node is rejected by the issue schema', () => {
    expect(IssueNode.safeParse(nodes[3]).success).toBe(false);
  });
});

describe('fetchSnapshot', () => {
  test('unions involves + role searches into roles', async () => {
    const calls: FakeCall[] = [];
    const gh = client(fakeGitHub({}, calls));
    const snap = await fetchSnapshot(gh);
    expect(snap.login).toBe('octocat');
    expect(snap.items.map((i) => i.type).sort()).toEqual(['discussion', 'issue', 'issue', 'pr']);
    expect(snap.counts).toMatchObject({ issues: 2, prs: 1, discussions: 1, unknownNodes: 1 });
    expect([...must(snap.roles.get('I_kwDOAbCdEf5xyz001'))].sort()).toEqual(['author', 'commenter']);
    expect([...must(snap.roles.get('I_kwDOAbCdEf5xyz002'))].sort()).toEqual(['assigned']);
    expect([...must(snap.roles.get('PR_kwDOAbCdEf5abc001'))].sort()).toEqual(['mentioned', 'reviewer']);
    expect([...must(snap.roles.get('D_kwDOAbCdEf4def001'))].sort()).toEqual(['commenter']);
    expect(calls.filter((c) => c.operation === 'RoleIds')).toHaveLength(6);
    expect(calls.find((c) => c.operation === 'InvolvedIssues')?.variables.q).toBe(
      'involves:octocat sort:updated-desc',
    );
  });

  test('follows pagination cursors', async () => {
    const calls: FakeCall[] = [];
    const page1 = structuredClone(issuesPage);
    page1.data.search.pageInfo = { hasNextPage: true, endCursor: 'c1' };
    let n = 0;
    const gh = client(
      fakeGitHub(
        {
          get InvolvedIssues() {
            n += 1;
            return n === 1 ? page1 : issuesPage;
          },
        },
        calls,
      ),
    );
    const snap = await fetchSnapshot(gh);
    const issueCalls = calls.filter((c) => c.operation === 'InvolvedIssues');
    expect(issueCalls).toHaveLength(2);
    expect(issueCalls[1]?.variables.after).toBe('c1');
    expect(snap.items.filter((i) => i.type !== 'discussion')).toHaveLength(3); // deduped by id
  });

  test('schema violation surfaces as a GitHubError(kind schema)', async () => {
    const gh = client(fakeGitHub({ Viewer: { data: { viewer: null } } }));
    const err = await fetchSnapshot(gh).catch((e) => e);
    expect(err.kind).toBe('schema');
  });
});
