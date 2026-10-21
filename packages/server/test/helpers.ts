import type { Item } from '@octotally/shared';
import postgres from 'postgres';
import { type DbHandle, openDb } from '../src/db';
import { seedViews } from '../src/lib/settings';
import { configureLog } from '../src/log';
import discussionsPage from './fixtures/discussions-page1.json';
import issuesPage from './fixtures/issues-page1.json';
import roleIds from './fixtures/role-ids.json';
import viewer from './fixtures/viewer.json';

configureLog('silent');

/**
 * Postgres for tests: `TEST_DATABASE_URL` (bin/verify starts a throwaway container, CI a service).
 * Missing → null, so the Postgres-only tests skip with a message; on CI a missing URL is an error,
 * so they can never be skipped silently there.
 */
export function pgUrl(): string | null {
  const url = process.env.TEST_DATABASE_URL || null;
  if (!url && process.env.CI)
    throw new Error('TEST_DATABASE_URL must be set on CI: the Postgres tests may not skip');
  return url;
}

/** Engine the shared-layer tests run on: `TEST_DB_ENGINE=postgres` switches every `memDb()` to Postgres. */
export const TEST_ENGINE = process.env.TEST_DB_ENGINE === 'postgres' ? 'postgres' : 'sqlite';

let schemaSeq = 0;
/** A fresh, unused schema name for this process. */
export function testSchema(prefix = 't'): string {
  schemaSeq += 1;
  return `${prefix}_${process.pid}_${Date.now().toString(36)}_${schemaSeq}`;
}

const open: { h: DbHandle; schema: string | null }[] = [];

/** Closes every handle `freshDb`/`memDb` opened and drops their Postgres schemas (test/setup.ts, afterEach). */
export async function closeTestDbs(): Promise<void> {
  const list = open.splice(0);
  for (const { h } of list) await h.close();
  const schemas = list.map((x) => x.schema).filter((x): x is string => x !== null);
  const url = schemas.length ? pgUrl() : null;
  if (!url) return;
  const admin = postgres(url, { onnotice: () => {}, max: 1 });
  try {
    for (const schema of schemas) await admin.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await admin.end({ timeout: 5 });
  }
}

/** Keeps a handle for closeTestDbs; `schema` is a Postgres schema to drop afterwards. */
export function track(h: DbHandle, schema: string | null = null): DbHandle {
  open.push({ h, schema });
  return h;
}

/** An empty, migrated database on `engine` (fresh schema on Postgres), closed after the test. */
export async function freshDb(engine: 'sqlite' | 'postgres' = TEST_ENGINE): Promise<DbHandle> {
  if (engine === 'sqlite') return track(await openDb(':memory:'));
  const url = pgUrl();
  if (!url) throw new Error('TEST_DB_ENGINE=postgres needs TEST_DATABASE_URL');
  const schema = testSchema();
  return track(await openDb({ engine: 'postgres', url, schema, source: 'env' }), schema);
}

/** The database most tests use: fresh, with the built-in views seeded like at start-up. */
export async function memDb(): Promise<DbHandle> {
  const h = await freshDb();
  await seedViews(h.db);
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
        // `is:issue`/`is:pr` prefix is stripped: fixtures are keyed by the role qualifier only.
        const q = String(body.variables.q).replace(/^is:(issue|pr)\s+/, '');
        const qualifier = q.split(':')[0] as keyof typeof roleIds;
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
