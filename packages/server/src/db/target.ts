import path from 'node:path';

export type Engine = 'sqlite' | 'postgres';
/** Where the database choice came from: the Octoforge adoption file, `DATABASE_URL`, or the built-in default. */
export type DbSource = 'octoforge' | 'env' | 'none';

/** A resolved database: what `openDb` needs. `schema` is null on SQLite. */
export interface DbTarget {
  engine: Engine;
  url: string;
  schema: string | null;
  source: DbSource;
}

/** Postgres schema names octotally accepts: a plain lowercase identifier, never quoted. */
export const SCHEMA_RE = /^[a-z_][a-z0-9_]*$/;
export const SCHEMA_MAX = 63;

export function validSchemaName(name: string): boolean {
  return name.length <= SCHEMA_MAX && SCHEMA_RE.test(name);
}

/** `postgres://` / `postgresql://` → postgres; `sqlite:<path>` (or `sqlite::memory:`) → sqlite; else null. */
export function engineOf(url: string): Engine | null {
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgres';
  if (/^sqlite:/i.test(url)) return 'sqlite';
  return null;
}

/** `sqlite:./data/x.db` → absolute path; `sqlite::memory:` → `:memory:`. Also takes a bare path. */
export function sqliteFile(url: string): string {
  const file = url.replace(/^sqlite:(\/\/)?/i, '');
  return file === ':memory:' ? file : path.resolve(file);
}

/**
 * Builds a target from a URL. A bare path (no scheme) is a SQLite file, so `openDb(':memory:')` and
 * `openDb('/data/x.db')` keep working. Throws with a reason on an unknown scheme or a bad schema name.
 */
export function toTarget(url: string, schema: string | null = null, source: DbSource = 'none'): DbTarget {
  const engine = engineOf(url) ?? (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? null : 'sqlite');
  if (!engine)
    throw new Error(`database url: unsupported scheme in ${redactUrl(url)} (use postgres:// or sqlite:)`);
  if (engine === 'sqlite') return { engine, url: `sqlite:${sqliteFile(url)}`, schema: null, source };
  const name = schema ?? 'octotally';
  if (!validSchemaName(name)) {
    throw new Error(`database schema "${name}": must match ${SCHEMA_RE} (max ${SCHEMA_MAX} characters)`);
  }
  return { engine, url, schema: name, source };
}

/** The URL with its password replaced, safe for logs and messages. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/(\/\/[^:/@]+:)[^@]*@/, '$1***@');
  }
}

/**
 * Same database when the engine and the place match: the file path for SQLite, host, port, database
 * and schema for Postgres (credentials are ignored: two roles on one schema are still one database).
 */
export function sameDatabase(a: DbTarget, b: DbTarget): boolean {
  if (a.engine !== b.engine) return false;
  if (a.engine === 'sqlite')
    return sqliteFile(a.url) === sqliteFile(b.url) && sqliteFile(a.url) !== ':memory:';
  const ua = new URL(a.url);
  const ub = new URL(b.url);
  const where = (u: URL) => `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  return where(ua) === where(ub) && a.schema === b.schema;
}
