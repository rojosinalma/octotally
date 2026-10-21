import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { type SQL, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { log } from '../log';
import type { Db, DbHandle, Orm } from './index';
import * as tables from './schema';
import { type DbTarget, sqliteFile } from './target';

const MIGRATIONS_DIR = path.resolve(import.meta.dir, 'migrations/sqlite');

/** One transaction at a time on the single connection. */
function createMutex() {
  let tail: Promise<void> = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

/** Opens (creating when needed) the SQLite file, enables WAL + foreign keys, applies bundled migrations. */
export function openSqlite(target: DbTarget): DbHandle {
  const file = sqliteFile(target.url);
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const client = new Database(file, { create: true, strict: true });
  client.run('PRAGMA journal_mode = WAL');
  client.run('PRAGMA foreign_keys = ON');
  client.run('PRAGMA busy_timeout = 5000');
  const orm = drizzle(client);
  try {
    migrate(orm, { migrationsFolder: MIGRATIONS_DIR });
  } catch (err) {
    client.close();
    throw err;
  }
  log('db').info({ engine: 'sqlite', file, migrations: MIGRATIONS_DIR }, 'database ready');

  const serialise = createMutex();
  const base = (transaction: Db['transaction']): Db => ({
    engine: 'sqlite',
    orm: orm as unknown as Orm,
    t: tables,
    transaction,
    async exec(query: SQL) {
      orm.run(query);
    },
  });
  // bun:sqlite is synchronous, so drizzle's own transaction cannot span awaits: BEGIN/COMMIT on the one
  // connection does, queued so two transactions never overlap. A statement issued outside a transaction
  // while one is open lands in it (one connection); harmless here, and the reason transactions stay short.
  const db: Db = base((fn) =>
    serialise(async () => {
      const inner: Db = base((nested) => nested(inner));
      client.run('BEGIN IMMEDIATE');
      try {
        const out = await fn(inner);
        client.run('COMMIT');
        return out;
      } catch (err) {
        client.run('ROLLBACK');
        throw err;
      }
    }),
  );

  return {
    db,
    target,
    file,
    async ping() {
      try {
        orm.get(sql`SELECT 1`);
        return true;
      } catch (err) {
        log('db').error({ err }, 'ping failed');
        return false;
      }
    },
    async close() {
      client.close();
    },
  };
}
