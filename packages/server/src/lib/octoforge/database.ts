import fs from 'node:fs';
import type { ApiErrKind } from '@octotally/shared';
import { asc, count, getTableName, sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import {
  adoptionFilePath,
  type Db,
  type DbHandle,
  type DbTarget,
  DEFAULT_SCHEMA,
  engineOf,
  openDb,
  redactUrl,
  SCHEMA_MAX,
  SCHEMA_RE,
  sameDatabase,
  type Tables,
  toTarget,
  writeAdoptionFile,
} from '../../db';
import { errInfo, log } from '../../log';

/** Errors the adopt/drop routes map to the JSON envelope (`kind` → HTTP status, `message` → user). */
export class DatabaseError extends Error {
  constructor(
    readonly kind: Extract<ApiErrKind, 'validation' | 'upstream' | 'system'>,
    message: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export interface DatabaseStatus {
  engine: DbTarget['engine'];
  /** Postgres only. */
  schema?: string;
  source: DbTarget['source'];
}

/** What the running instance uses. Never carries the URL. */
export function databaseStatus(handle: DbHandle): DatabaseStatus {
  const { engine, schema, source } = handle.target;
  return engine === 'postgres' && schema ? { engine, schema, source } : { engine, source };
}

export interface AdoptInput {
  url: string;
  /** Postgres schema; ignored for SQLite. Defaults to `octotally`. */
  schema?: string | null;
  /** Copy every row from the current database (contract default: true). */
  copy?: boolean;
}

export interface AdoptOptions {
  /** Rows per read/insert round trip. */
  batchSize?: number;
  /** Test seam: runs inside the target transaction after the copy, before the counts are compared. */
  afterCopy?: (target: Db) => Promise<void>;
}

/** Tables in foreign-key order (parents first) with the column to page by. */
const COPY_ORDER = [
  ['items', 'id'],
  ['activity', 'id'],
  ['settings', 'key'],
  ['views', 'id'],
  ['digests', 'id'],
  ['syncRuns', 'id'],
] as const satisfies readonly (readonly [keyof Tables, string])[];

/** Tables with an identity/serial id copied explicitly: the Postgres sequence must move past them. */
const IDENTITY_TABLES = ['digests', 'syncRuns'] as const satisfies readonly (keyof Tables)[];

const DEFAULT_BATCH = 500;

/** A table of either engine as the shared query builder sees it (one row type per call is enough). */
type AnyTable = Tables['settings'];
const asAny = (t: Tables[keyof Tables]) => t as unknown as AnyTable;

/** Rows per table, keyed by SQL table name. */
export async function countRows(db: Db): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const [key] of COPY_ORDER) {
    const t = db.t[key];
    const [r] = await db.orm.select({ n: count() }).from(asAny(t));
    out[getTableName(t)] = r?.n ?? 0;
  }
  return out;
}

function parseInput(input: AdoptInput): { target: DbTarget; copy: boolean } {
  if (typeof input?.url !== 'string' || input.url === '')
    throw new DatabaseError('validation', 'url: required');
  const engine = engineOf(input.url);
  if (!engine) {
    throw new DatabaseError(
      'validation',
      `url: unsupported scheme in ${redactUrl(input.url)} (use postgres://, postgresql:// or sqlite:<path>)`,
    );
  }
  const schema = input.schema ?? DEFAULT_SCHEMA;
  if (engine === 'postgres' && (schema.length > SCHEMA_MAX || !SCHEMA_RE.test(schema))) {
    throw new DatabaseError(
      'validation',
      `schema "${schema}": must match ${SCHEMA_RE} (max ${SCHEMA_MAX} characters)`,
    );
  }
  try {
    return { target: toTarget(input.url, schema, 'octoforge'), copy: input.copy ?? true };
  } catch (err) {
    throw new DatabaseError('validation', (err as Error).message);
  }
}

/**
 * Moves octotally onto another database (Octoforge contract §3, Adoption):
 *  1. connect to `url`, create `schema` when missing (Postgres), run the migrations there;
 *  2. `copy` (default): refuse a target that already holds rows, copy every table in FK order in one
 *     target transaction, batched, reset the Postgres id sequences, compare the row counts per table;
 *     any difference rolls the target back and throws;
 *  3. write `DATA_DIR/octoforge-database.json` (0600), which the next start-up uses.
 * The current database is only read and stays in use until the restart. Any failure leaves the file
 * unwritten. Returns the target's rows per table.
 */
export async function adoptDatabase(
  current: DbHandle,
  input: AdoptInput,
  dataDir: string,
  opts: AdoptOptions = {},
): Promise<{ tables: Record<string, number> }> {
  const logger = log('db');
  const { target, copy } = parseInput(input);
  const where = { engine: target.engine, url: redactUrl(target.url), schema: target.schema, copy };
  if (copy && sameDatabase(current.target, target)) {
    throw new DatabaseError(
      'validation',
      'the target is the database already in use; adopt it with copy: false',
    );
  }
  const batch = Math.max(1, opts.batchSize ?? DEFAULT_BATCH);

  logger.info(where, 'adoption started');
  let dest: DbHandle;
  try {
    dest = await openDb(target);
  } catch (err) {
    logger.error({ ...where, err: errInfo(err) }, 'adoption: cannot open the target');
    throw new DatabaseError('upstream', `cannot open ${redactUrl(target.url)}: ${(err as Error).message}`);
  }

  try {
    let tables: Record<string, number>;
    if (copy) {
      const existing = await countRows(dest.db);
      const filled = Object.entries(existing).filter(([, n]) => n > 0);
      if (filled.length) {
        throw new DatabaseError(
          'validation',
          `the target already holds rows (${filled.map(([t, n]) => `${t}: ${n}`).join(', ')}); ` +
            'empty it, or adopt with copy: false to use its data as is',
        );
      }
      tables = await copyAll(current.db, dest.db, batch, opts.afterCopy);
    } else {
      tables = await countRows(dest.db);
    }
    writeAdoptionFile(dataDir, { url: target.url, schema: target.schema });
    logger.info({ ...where, tables }, 'adoption done; restart to use the new database');
    return { tables };
  } catch (err) {
    logger.error({ ...where, err: errInfo(err) }, 'adoption failed; the current database stays in use');
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError('system', `adoption failed: ${(err as Error).message}`);
  } finally {
    await dest.close();
  }
}

/**
 * Copies inside a read transaction on the source (SQLite: holds the writer lock; Postgres: one
 * repeatable-read snapshot), so the counts compared at the end describe exactly what was read.
 */
async function copyAll(
  source: Db,
  dest: Db,
  batch: number,
  afterCopy: AdoptOptions['afterCopy'],
): Promise<Record<string, number>> {
  return source.transaction(async (src) => {
    if (src.engine === 'postgres')
      await src.exec(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
    const expected = await countRows(src);
    return dest.transaction(async (tx) => {
      for (const [key, pk] of COPY_ORDER) {
        const from = asAny(src.t[key]);
        const into = asAny(tx.t[key]);
        const order = (from as unknown as Record<string, Parameters<typeof asc>[0]>)[pk];
        if (!order) throw new Error(`copy: ${key} has no column ${pk}`);
        for (let offset = 0; ; offset += batch) {
          const rows = await src.orm.select().from(from).orderBy(asc(order)).limit(batch).offset(offset);
          if (rows.length) await tx.orm.insert(into).values(rows);
          if (rows.length < batch) break;
        }
      }
      if (tx.engine === 'postgres') {
        for (const key of IDENTITY_TABLES) {
          const t = tx.t[key];
          // Next id = max + 1 (1 on an empty table): the copied ids were explicit, the sequence did not move.
          await tx.exec(
            sql`SELECT setval(pg_get_serial_sequence(${qualifiedName(t)}, 'id'), coalesce(max(${t.id}), 0) + 1, false) FROM ${t}`,
          );
        }
      }
      if (afterCopy) await afterCopy(tx);
      const actual = await countRows(tx);
      const diff = Object.keys(expected).filter((name) => expected[name] !== actual[name]);
      if (diff.length) {
        throw new DatabaseError(
          'system',
          `row counts differ after the copy (${diff.map((n) => `${n}: ${expected[n]} → ${actual[n]}`).join(', ')}); nothing was adopted`,
        );
      }
      return actual;
    });
  });
}

/** `"schema"."table"` as text, for pg_get_serial_sequence. */
function qualifiedName(t: Tables[keyof Tables]): string {
  const { schema, name } = getTableConfig(t as unknown as PgTable);
  return schema ? `"${schema}"."${name}"` : `"${name}"`;
}

/** Removes the adoption file (`DELETE /database`); the next start-up falls back to DATABASE_URL / SQLite. */
export async function dropAdoptedDatabase(dataDir: string): Promise<{ removed: boolean }> {
  const file = adoptionFilePath(dataDir);
  try {
    await fs.promises.unlink(file);
    log('db').info({ file }, 'adoption file removed; restart to use DATABASE_URL or the default database');
    return { removed: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { removed: false };
    throw new DatabaseError('system', `cannot remove ${file}: ${(err as Error).message}`);
  }
}
