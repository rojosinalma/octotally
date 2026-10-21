import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import {
  ADOPTION_FILE,
  type DbHandle,
  openDb,
  readAdoptionFile,
  redactUrl,
  resolveDatabase,
  sameDatabase,
  toTarget,
  validSchemaName,
} from '../src/db';
import { loadEnv } from '../src/env';
import { dispatchDigest } from '../src/lib/digest';
import { listActivity, listItems, setHidden } from '../src/lib/items';
import {
  adoptDatabase,
  DatabaseError,
  databaseStatus,
  dropAdoptedDatabase,
} from '../src/lib/octoforge/database';
import { getSettings, listViews, patchSettings, seedViews } from '../src/lib/settings';
import { Syncer } from '../src/lib/sync';
import { StaticToken } from '../src/lib/token';
import issuesPage from './fixtures/issues-page1.json';
import { fakeGitHub, freshDb, memDb, noSleep, pgUrl, testSchema, track } from './helpers';

const ISSUE = 'I_kwDOAbCdEf5xyz001';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'octotally-db-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A database with every table filled: two syncs (items, activity, sync_runs), settings, a view, digests. */
async function populated(h?: DbHandle): Promise<DbHandle> {
  const src = h ?? (await memDb());
  const run = (o: Record<string, unknown> = {}) =>
    new Syncer({
      db: src.db,
      tokens: new StaticToken('t'),
      clientOptions: { fetch: fakeGitHub(o), sleep: noSleep },
    }).run();
  await run();
  const page = structuredClone(issuesPage);
  const n = page.data.search.nodes[0] as { updatedAt: string; comments: { nodes: unknown[] } };
  n.updatedAt = '2026-10-13T08:00:00Z';
  n.comments.nodes = [
    {
      author: { login: 'maintainer' },
      createdAt: n.updatedAt,
      url: 'https://github.com/acme/widgets/issues/142#c',
    },
  ];
  await run({ InvolvedIssues: page });
  await setHidden(src.db, ISSUE, 'muted');
  const settings = await patchSettings(src.db, {
    discordWebhookUrl: 'https://discord.com/api/webhooks/1/x',
    pollIntervalMin: 7,
  });
  await src.db.orm
    .insert(src.db.t.views)
    .values({ id: 'mine', name: 'Mine', query: 'author:@me', position: 9 });
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
  try {
    await dispatchDigest(src.db, settings, { kind: 'daily', title: 't', lines: ['a'] });
    await dispatchDigest(src.db, settings, { kind: 'realtime', title: 't', lines: ['b'] });
  } finally {
    globalThis.fetch = realFetch;
  }
  return src;
}

/** Everything a user sees, for comparing two databases. */
async function snapshot(h: DbHandle) {
  const items = (await listItems(h.db)).sort((a, b) => a.id.localeCompare(b.id));
  return {
    items,
    activity: await listActivity(h.db, ISSUE),
    settings: await getSettings(h.db),
    views: await listViews(h.db),
    runs: await h.db.orm.select().from(h.db.t.syncRuns).orderBy(h.db.t.syncRuns.id),
    digests: await h.db.orm.select().from(h.db.t.digests).orderBy(h.db.t.digests.id),
  };
}

const sqliteUrl = (name = 'adopted.db') => `sqlite:${path.join(dir, 'shared', name)}`;

describe('migrations', () => {
  test('the SQLite init migration keeps the tag, timestamp and hash databases created before 0.2 recorded', () => {
    const [first] = readMigrationFiles({
      migrationsFolder: path.resolve(import.meta.dir, '../src/db/migrations/sqlite'),
    });
    expect(first?.folderMillis).toBe(1791908374283);
    expect(first?.hash).toBe('ff2f80d3d19819b5dc0b1a797c7e1c44fd8c30ad2edf4782ea1161fc0a216ac2');
  });

  test('Postgres migrations name no schema (they run inside DATABASE_SCHEMA)', () => {
    const d = path.resolve(import.meta.dir, '../src/db/migrations/postgres');
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.sql'))) {
      expect(fs.readFileSync(path.join(d, f), 'utf8')).not.toContain('"public".');
    }
  });

  test('re-opening a SQLite file does not re-run migrations and keeps the data', async () => {
    const file = path.join(dir, 'x.db');
    const a = await openDb(file);
    await patchSettings(a.db, { pollIntervalMin: 9 });
    await a.close();
    const b = track(await openDb(`sqlite:${file}`));
    expect((await getSettings(b.db)).pollIntervalMin).toBe(9);
  });
});

describe('targets and schema names', () => {
  test('schema names: lowercase identifiers only, max 63', () => {
    for (const ok of ['octotally', '_x', 'a1_b2', 'a'.repeat(63)]) expect(validSchemaName(ok)).toBe(true);
    for (const bad of ['', 'Octo', '1abc', 'a-b', 'a b', 'a"b', 'x;drop', 'a'.repeat(64)]) {
      expect(validSchemaName(bad)).toBe(false);
    }
    expect(() => toTarget('postgres://u:p@h/db', 'Bad-Name')).toThrow(/must match/);
    expect(() => toTarget('mysql://h/db')).toThrow(/unsupported scheme/);
  });

  test('SQLite ignores the schema; a bare path is a SQLite file', () => {
    expect(toTarget('sqlite:./x.db', 'whatever')).toMatchObject({ engine: 'sqlite', schema: null });
    expect(toTarget('/data/x.db').url).toBe('sqlite:/data/x.db');
    expect(toTarget(':memory:').url).toBe('sqlite::memory:');
  });

  test('redactUrl hides the password, nothing else', () => {
    expect(redactUrl('postgres://user:s3cret@db:5432/app')).toBe('postgres://user:***@db:5432/app');
    expect(redactUrl('postgres://db/app')).toBe('postgres://db/app');
  });

  test('sameDatabase ignores credentials, not the schema', () => {
    const a = toTarget('postgres://a:1@db:5432/app', 'one');
    expect(sameDatabase(a, toTarget('postgres://b:2@db/app', 'one'))).toBe(true);
    expect(sameDatabase(a, toTarget('postgres://a:1@db/app', 'two'))).toBe(false);
  });

  test('env: DATABASE_URL scheme and DATABASE_SCHEMA are validated', () => {
    expect(loadEnv({ DATABASE_URL: 'postgres://h/db' }).DATABASE_SCHEMA).toBe('octotally');
    expect(() => loadEnv({ DATABASE_URL: 'mysql://h/db' })).toThrow();
    expect(() => loadEnv({ DATABASE_SCHEMA: 'Nope' })).toThrow();
  });
});

describe('resolveDatabase', () => {
  test('nothing set → SQLite in DATA_DIR, source none', () => {
    expect(resolveDatabase({ DATA_DIR: dir })).toEqual({
      engine: 'sqlite',
      url: `sqlite:${path.join(dir, 'octotally.db')}`,
      schema: null,
      source: 'none',
    });
  });

  test('DATABASE_URL → source env, schema defaults to octotally', () => {
    expect(resolveDatabase({ DATA_DIR: dir, DATABASE_URL: 'postgres://u:p@h/db' })).toMatchObject({
      engine: 'postgres',
      schema: 'octotally',
      source: 'env',
    });
    expect(
      resolveDatabase({ DATA_DIR: dir, DATABASE_URL: 'postgresql://h/db', DATABASE_SCHEMA: 'tally' }).schema,
    ).toBe('tally');
  });

  test('the adoption file overrides DATABASE_URL / DATABASE_SCHEMA', () => {
    fs.writeFileSync(
      path.join(dir, ADOPTION_FILE),
      JSON.stringify({ url: 'postgres://h/forge', schema: 'tally' }),
    );
    expect(
      resolveDatabase({ DATA_DIR: dir, DATABASE_URL: 'postgres://h/other', DATABASE_SCHEMA: 'x' }),
    ).toEqual({ engine: 'postgres', url: 'postgres://h/forge', schema: 'tally', source: 'octoforge' });
  });

  test('a malformed adoption file fails start-up with the reason', () => {
    const file = path.join(dir, ADOPTION_FILE);
    fs.writeFileSync(file, '{not json');
    expect(() => resolveDatabase({ DATA_DIR: dir })).toThrow(/not valid JSON/);
    fs.writeFileSync(file, JSON.stringify({ url: 'ftp://x' }));
    expect(() => resolveDatabase({ DATA_DIR: dir })).toThrow(/url: must start with/);
    fs.writeFileSync(file, JSON.stringify({ url: 'postgres://h/db', schema: 'Bad' }));
    expect(() => resolveDatabase({ DATA_DIR: dir })).toThrow(/must match/);
  });
});

// Under TEST_DB_ENGINE=postgres the source is Postgres, so this block also covers Postgres → SQLite.
describe('adoptDatabase (SQLite target)', () => {
  test('copies every table, answers the counts, writes the file 0600, and the resolver picks it up', async () => {
    const src = await populated();
    const before = await snapshot(src);
    const url = sqliteUrl();
    const { tables } = await adoptDatabase(src, { url, schema: 'ignored', copy: true }, dir);
    expect(tables).toEqual({
      items: 4,
      activity: 1,
      settings: 2,
      views: before.views.length,
      digests: 2,
      sync_runs: 2,
    });

    const file = path.join(dir, ADOPTION_FILE);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(readAdoptionFile(dir)).toEqual({ url, schema: null });
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);

    const target = resolveDatabase({ DATA_DIR: dir, DATABASE_URL: 'postgres://ignored/db' });
    expect(target).toMatchObject({ engine: 'sqlite', url, source: 'octoforge' });
    const next = track(await openDb(target));
    expect(await snapshot(next)).toEqual(before);
    expect(databaseStatus(next)).toEqual({ engine: 'sqlite', source: 'octoforge' });
    // The source is only read and keeps working.
    expect(await snapshot(src)).toEqual(before);
  });

  test('copy is batched: a batch smaller than every table still copies all rows', async () => {
    const src = await populated();
    const { tables } = await adoptDatabase(src, { url: sqliteUrl(), copy: true }, dir, { batchSize: 1 });
    expect(tables.items).toBe(4);
    expect(tables.views).toBe((await listViews(src.db)).length);
  });

  test('a row-count mismatch aborts: target rolled back, no file, the current database untouched', async () => {
    const src = await populated();
    const before = await snapshot(src);
    const url = sqliteUrl();
    const err = await adoptDatabase(src, { url, copy: true }, dir, {
      afterCopy: async (tx) => {
        await tx.orm.delete(tx.t.activity);
      },
    }).catch((e) => e);
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.kind).toBe('system');
    expect(err.message).toMatch(/row counts differ.*activity: 1 → 0/);
    expect(fs.existsSync(path.join(dir, ADOPTION_FILE))).toBe(false);
    expect(await snapshot(src)).toEqual(before);
    const target = track(await openDb(url));
    expect(await listItems(target.db)).toEqual([]);
  });

  test('copy into a target that already holds rows is refused; copy: false adopts it as is', async () => {
    const src = await populated();
    const url = sqliteUrl();
    const other = await openDb(url);
    await patchSettings(other.db, { pollIntervalMin: 3 });
    await other.close();

    const err = await adoptDatabase(src, { url, copy: true }, dir).catch((e) => e);
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.kind).toBe('validation');
    expect(err.message).toMatch(/already holds rows \(settings: 1\)/);
    expect(fs.existsSync(path.join(dir, ADOPTION_FILE))).toBe(false);

    const { tables } = await adoptDatabase(src, { url, copy: false }, dir);
    expect(tables).toMatchObject({ settings: 1, items: 0 });
    expect(readAdoptionFile(dir)?.url).toBe(url);
  });

  test('input validation and unreachable targets map to typed errors', async () => {
    const src = await memDb();
    const kind = (p: Promise<unknown>) => p.then(() => 'resolved').catch((e: DatabaseError) => e.kind);
    expect(await kind(adoptDatabase(src, { url: '' }, dir))).toBe('validation');
    expect(await kind(adoptDatabase(src, { url: 'mysql://h/db' }, dir))).toBe('validation');
    expect(await kind(adoptDatabase(src, { url: 'postgres://u:p@h/db', schema: 'Bad;' }, dir))).toBe(
      'validation',
    );
    expect(await kind(adoptDatabase(src, { url: 'sqlite:/proc/nope/x.db' }, dir))).toBe('upstream');
    const err = await adoptDatabase(
      src,
      { url: 'postgres://u:topsecret@127.0.0.1:1/db?connect_timeout=1' },
      dir,
    ).catch((e) => e);
    expect(err.kind).toBe('upstream');
    expect(err.message).not.toContain('topsecret');
    expect(fs.existsSync(path.join(dir, ADOPTION_FILE))).toBe(false);
  });

  test('dropAdoptedDatabase removes the file once', async () => {
    const src = await memDb();
    await adoptDatabase(src, { url: sqliteUrl(), copy: true }, dir);
    expect(await dropAdoptedDatabase(dir)).toEqual({ removed: true });
    expect(await dropAdoptedDatabase(dir)).toEqual({ removed: false });
    expect(resolveDatabase({ DATA_DIR: dir }).source).toBe('none');
  });

  test('databaseStatus never carries the URL', async () => {
    const src = await freshDb('sqlite');
    expect(databaseStatus(src)).toEqual({ engine: 'sqlite', source: 'none' });
  });
});

const PG = pgUrl();
if (!PG)
  console.warn('postgres tests SKIPPED: TEST_DATABASE_URL not set (bin/verify starts a Postgres container)');
const pgDescribe = PG ? describe : describe.skip;

pgDescribe('adoptDatabase (Postgres target)', () => {
  const url = PG ?? '';

  /** Schemas the test creates; dropped by the shared teardown through `track`. */
  async function pgTarget(schema: string): Promise<DbHandle> {
    return track(await openDb({ engine: 'postgres', url, schema, source: 'env' }), schema);
  }

  test('SQLite → Postgres: same data, schema created, sequences moved past the copied ids', async () => {
    const src = await populated();
    const before = await snapshot(src);
    const schema = testSchema('adopt');
    const { tables } = await adoptDatabase(src, { url, schema, copy: true }, dir);
    expect(tables).toMatchObject({ items: 4, activity: 1, settings: 2, digests: 2, sync_runs: 2 });
    expect(readAdoptionFile(dir)).toEqual({ url, schema });

    const target = resolveDatabase({ DATA_DIR: dir });
    expect(target).toMatchObject({ engine: 'postgres', schema, source: 'octoforge' });
    const next = await pgTarget(schema);
    expect(await snapshot(next)).toEqual(before);
    expect(databaseStatus(next)).toEqual({ engine: 'postgres', schema, source: 'env' });

    // New rows get fresh ids instead of colliding with the copied ones.
    const [run] = await next.db.orm.insert(next.db.t.syncRuns).values({ startedAt: 'x' }).returning();
    expect(run?.id).toBe(3);
    const [digest] = await next.db.orm
      .insert(next.db.t.digests)
      .values({ sentAt: 'x', kind: 'daily', notifier: 'n', payloadHash: 'h' })
      .returning();
    expect(digest?.id).toBe(3);
  });

  test('Postgres → Postgres, and a non-empty target is refused', async () => {
    const pg = await freshDb('postgres');
    await seedViews(pg.db);
    const src = await populated(pg);
    const before = await snapshot(src);
    const schema = testSchema('adopt');
    await adoptDatabase(src, { url, schema, copy: true }, dir);
    const next = await pgTarget(schema);
    expect(await snapshot(next)).toEqual(before);

    const err = await adoptDatabase(src, { url, schema, copy: true }, dir).catch((e) => e);
    expect(err.kind).toBe('validation');
    expect(err.message).toMatch(/already holds rows|already in use/);
  });

  test('a mismatch rolls the Postgres target back', async () => {
    const src = await populated();
    const schema = testSchema('adopt');
    const err = await adoptDatabase(src, { url, schema, copy: true }, dir, {
      afterCopy: async (tx) => {
        await tx.orm.delete(tx.t.views).where(eq(tx.t.views.id, 'mine'));
      },
    }).catch((e) => e);
    expect(err.message).toMatch(/row counts differ.*views/);
    expect(fs.existsSync(path.join(dir, ADOPTION_FILE))).toBe(false);
    const target = await pgTarget(schema);
    expect(await listItems(target.db)).toEqual([]);
  });

  test('an existing schema owned by the role is used as is (no CREATE on the database needed)', async () => {
    const schema = testSchema('own');
    const first = await pgTarget(schema);
    await first.close();
    const again = await pgTarget(schema);
    expect(await again.ping()).toBe(true);
  });
});
