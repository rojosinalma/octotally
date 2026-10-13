import type { Item } from '@octotally/shared';
import { type DbHandle, openDb } from '../src/db';
import { seedViews } from '../src/lib/settings';
import { configureLog } from '../src/log';
import discussionsPage from './fixtures/discussions-page1.json';
import issuesPage from './fixtures/issues-page1.json';
import roleIds from './fixtures/role-ids.json';
import viewer from './fixtures/viewer.json';

configureLog('silent');

export function memDb(): DbHandle {
  const h = openDb(':memory:');
  seedViews(h.db);
  return h;
}

export const NOW = new Date('2026-10-13T12:00:00Z');
export const daysAgo = (n: number, from = NOW) => new Date(from.getTime() - n * 86_400_000).toISOString();

export function item(over: Partial<Item> = {}): Item {
  return {
    id: 'I_1',
    type: 'issue',
    number: 1,
    title: 'Energy stats wrong after restart',
    url: 'https://github.com/acme/widgets/issues/1',
    repo: 'acme/widgets',
    owner: 'acme',
    state: 'open',
    isDraft: false,
    author: 'octocat',
    labels: ['bug'],
    assignees: [],
    roles: ['author'],
    commentCount: 3,
    linkedPrs: [],
    isAnswered: null,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(2),
    lastActivityAt: daysAgo(2),
    lastActivityBy: 'maintainer',
    hidden: 'none',
    hiddenAt: null,
    mutedActivityAt: null,
    firstSeenAt: daysAgo(40),
    lastSyncedAt: daysAgo(0),
    ...over,
  };
}

export interface FakeCall {
  operation: string;
  variables: Record<string, unknown>;
}

/**
 * Routes GraphQL POSTs to recorded fixtures by operation name (and the role qualifier in `q`).
 * `overrides` lets a test swap one response (e.g. a second sync with new activity).
 */
export function fakeGitHub(overrides: Record<string, unknown> = {}, calls: FakeCall[] = []): typeof fetch {
  const handler = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
    const operation = /query\s+(\w+)/.exec(body.query)?.[1] ?? 'unknown';
    calls.push({ operation, variables: body.variables });
    const json = (v: unknown) =>
      new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } });
    if (operation in overrides) return json(overrides[operation]);
    switch (operation) {
      case 'Viewer':
        return json(viewer);
      case 'InvolvedIssues':
        return json(issuesPage);
      case 'InvolvedDiscussions':
        return json(discussionsPage);
      case 'RoleIds': {
        const qualifier = String(body.variables.q).split(':')[0] as keyof typeof roleIds;
        const key = `RoleIds:${qualifier}:${body.variables.type}`;
        if (key in overrides) return json(overrides[key]);
        return json(roleIds[qualifier] ?? roleIds['review-requested']);
      }
      default:
        return new Response(JSON.stringify({ errors: [{ message: `unknown op ${operation}` }] }), {
          status: 400,
        });
    }
  };
  return handler as unknown as typeof fetch;
}

export const noSleep = async () => {};

/** Narrows away null/undefined in tests without `!`. */
export function must<T>(v: T | null | undefined, what = 'value'): T {
  if (v === null || v === undefined) throw new Error(`expected ${what} to be present`);
  return v;
}
