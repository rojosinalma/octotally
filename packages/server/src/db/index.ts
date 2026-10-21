import type { SQL } from 'drizzle-orm';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { openPostgres } from './postgres';
import * as schema from './schema';
import type { PgTables } from './schema.pg';
import { openSqlite } from './sqlite';
import { type DbTarget, toTarget } from './target';

export type Tables = typeof schema;

/**
 * The query builder both engines share. It is typed as the SQLite dialect; on Postgres it is a
 * postgres-js drizzle instance over `PgTables`, whose row types are the same (checked below). Rule for
 * every query: build it from `db.t.*` and `await` it. Never call `.all()`, `.get()`, `.run()` or
 * `.values()` (SQLite-only); use `.limit(1)` and `[0]` for one row, and `count()` from drizzle-orm
 * for counts (Postgres returns `count(*)` as a string).
 */
export type Orm = Omit<BunSQLiteDatabase, 'transaction' | 'run' | 'all' | 'get' | 'values' | 'batch'>;

/** Dialect-neutral database: what `lib/` and the routes take. */
export interface Db {
  readonly engine: DbTarget['engine'];
  readonly orm: Orm;
  readonly t: Tables;
  /** Runs `fn` in one transaction; `tx` is used instead of the outer `db` inside it. Nested calls join. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  /** A raw statement whose result is not needed. */
  exec(query: SQL): Promise<void>;
}

export interface DbHandle {
  db: Db;
  /** What was opened (keeps the URL: never log or return it, use `redactUrl`). */
  target: DbTarget;
  /** The SQLite file (`:memory:` included); null on Postgres. */
  file: string | null;
  /** Cheap liveness probe used by /health. */
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/**
 * Opens the database and applies the bundled migrations of its engine. Takes a resolved target or a
 * URL / bare SQLite path (`':memory:'`, `/data/octotally.db`, `sqlite:...`, `postgres://...`).
 */
export async function openDb(target: DbTarget | string, pgSchema?: string): Promise<DbHandle> {
  const t = typeof target === 'string' ? toTarget(target, pgSchema ?? null) : target;
  return t.engine === 'postgres' ? openPostgres(t) : openSqlite(t);
}

// Compile-time guard: the Postgres tables must give exactly the SQLite row types, or shared queries lie.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Rows<T> = {
  [K in keyof T]: T[K] extends { $inferSelect: infer R; $inferInsert: infer I } ? [R, I] : never;
};
export type SchemasMatch = Same<Rows<Tables>, Rows<PgTables>> extends true ? true : never;
export const schemasMatch: SchemasMatch = true;

export * from './resolve';
export * from './target';
export { schema };
