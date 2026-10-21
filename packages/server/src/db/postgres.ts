import path from 'node:path';
import { type SQL, sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from '../log';
import type { Db, DbHandle, Orm, Tables } from './index';
import { createPgTables } from './schema.pg';
import { type DbTarget, redactUrl } from './target';

const MIGRATIONS_DIR = path.resolve(import.meta.dir, 'migrations/postgres');
const MIGRATIONS_TABLE = '__drizzle_migrations';

/**
 * Pool options come from the URL query (postgres-js reads `max`, `idle_timeout`, `connect_timeout`,
 * `prepare`, `sslmode`, ...), so nothing is fixed here except silencing NOTICE messages.
 */
export function pgClient(url: string): postgres.Sql {
  return postgres(url, { onnotice: () => {} });
}

/**
 * Creates the schema when missing. Checked first: `CREATE SCHEMA IF NOT EXISTS` needs the CREATE
 * privilege on the database even when the schema exists, and a member role usually only owns its schema.
 */
export async function ensureSchema(client: postgres.Sql, schema: string): Promise<void> {
  const [row] = await client`select exists(select 1 from pg_namespace where nspname = ${schema}) as present`;
  if (row?.present === true) return;
  await client.unsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
}

/**
 * Applies the bundled migrations inside `schema`: the files are unqualified, so `SET LOCAL search_path`
 * places them, and the journal table lives in the same schema. One transaction under an advisory lock,
 * so instances that start together migrate once. `SET LOCAL` keeps it safe behind poolers.
 */
export async function migratePostgres(client: postgres.Sql, schema: string): Promise<void> {
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_DIR });
  await client.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${`octotally-migrate:${schema}`}))`;
    await tx.unsafe(`SET LOCAL search_path TO "${schema}"`);
    await tx.unsafe(
      `CREATE TABLE IF NOT EXISTS "${schema}"."${MIGRATIONS_TABLE}" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
    );
    const [last] = await tx.unsafe(
      `select created_at from "${schema}"."${MIGRATIONS_TABLE}" order by created_at desc limit 1`,
    );
    for (const m of migrations) {
      if (last && Number(last.created_at) >= m.folderMillis) continue;
      for (const stmt of m.sql) if (stmt.trim()) await tx.unsafe(stmt);
      await tx.unsafe(`insert into "${schema}"."${MIGRATIONS_TABLE}" (hash, created_at) values ($1, $2)`, [
        m.hash,
        m.folderMillis,
      ]);
    }
  });
}

function wrap(orm: PostgresJsDatabase, t: Tables, transaction: Db['transaction']): Db {
  return {
    engine: 'postgres',
    orm: orm as unknown as Orm,
    t,
    transaction,
    async exec(query: SQL) {
      await orm.execute(query);
    },
  };
}

/** Connects, creates the schema when missing, applies the bundled migrations there. */
export async function openPostgres(target: DbTarget): Promise<DbHandle> {
  const schema = target.schema ?? 'octotally';
  const client = pgClient(target.url);
  try {
    await ensureSchema(client, schema);
    await migratePostgres(client, schema);
  } catch (err) {
    await client.end({ timeout: 5 }).catch(() => {});
    throw err;
  }
  const orm = drizzle(client);
  // The Postgres tables have the SQLite row types (checked in db/index.ts); queries treat both alike.
  const t = createPgTables(schema) as unknown as Tables;
  const db: Db = wrap(orm, t, (fn) =>
    orm.transaction((tx) => {
      const inner: Db = wrap(tx as unknown as PostgresJsDatabase, t, (nested) => nested(inner));
      return fn(inner);
    }),
  );
  log('db').info({ engine: 'postgres', url: redactUrl(target.url), schema }, 'database ready');

  return {
    db,
    target,
    file: null,
    async ping() {
      try {
        await orm.execute(sql`select 1`);
        return true;
      } catch (err) {
        log('db').error({ err }, 'ping failed');
        return false;
      }
    },
    async close() {
      await client.end({ timeout: 5 }).catch(() => {});
    },
  };
}
