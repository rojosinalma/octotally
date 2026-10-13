import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { log } from '../log';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface DbHandle {
  db: Db;
  sqlite: Database;
  path: string;
  /** Cheap liveness probe used by /health. */
  ping(): boolean;
  close(): void;
}

const MIGRATIONS_DIR = path.resolve(import.meta.dir, '../../drizzle');

/** Opens (creating when needed) the SQLite file, enables WAL + foreign keys, applies bundled migrations. */
export function openDb(file: string): DbHandle {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file, { create: true, strict: true });
  sqlite.run('PRAGMA journal_mode = WAL');
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run('PRAGMA busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  log('db').info({ file, migrations: MIGRATIONS_DIR }, 'database ready');
  return {
    db,
    sqlite,
    path: file,
    ping() {
      try {
        sqlite.query('SELECT 1').get();
        return true;
      } catch (err) {
        log('db').error({ err }, 'ping failed');
        return false;
      }
    },
    close() {
      sqlite.close();
    },
  };
}

export { schema };
