// Octoforge member contract v1, section 3 (database). STUB: the database work replaces this file.
import type { DbHandle } from '../../db';

export type DatabaseStatus = {
  engine: 'sqlite' | 'postgres';
  schema?: string;
  source: 'env' | 'octoforge' | 'none';
};

export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly kind: 'validation' | 'upstream' | 'system',
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/** Engine, schema and where the running database came from; never the URL. */
export function databaseStatus(_handle: DbHandle): DatabaseStatus {
  return { engine: 'sqlite', source: 'none' };
}

/** Migrates the target, copies rows when `copy` (row counts compared), writes DATA_DIR/octoforge-database.json. */
export async function adoptDatabase(
  _current: DbHandle,
  _input: { url: string; schema: string; copy: boolean },
  _dataDir: string,
): Promise<{ tables: Record<string, number> }> {
  throw new DatabaseError('database adoption is not implemented yet', 'system');
}

/** Removes DATA_DIR/octoforge-database.json; the next start uses DATABASE_URL again. */
export async function dropAdoptedDatabase(_dataDir: string): Promise<{ removed: boolean }> {
  throw new DatabaseError('database adoption is not implemented yet', 'system');
}
