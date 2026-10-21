import path from 'node:path';
import { z } from 'zod';
import { engineOf, SCHEMA_MAX, SCHEMA_RE } from './db/target';

/**
 * Bootstrap + secrets only. Every tunable lives in the settings table.
 * Bun loads `.env` from the cwd (and `--env-file`) before this runs.
 */
const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_DIR: z.string().default('./data'),
  GITHUB_TOKEN: z.string().optional(),
  AUTH_PASSWORD: z.string().optional(),
  API_TOKEN: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  WEB_DIST: z.string().optional(),
  /** postgres://, postgresql:// or sqlite:<path>; unset = SQLite at DATA_DIR/octotally.db. */
  DATABASE_URL: z
    .string()
    .refine((u) => engineOf(u) !== null, 'must start with postgres://, postgresql:// or sqlite:')
    .optional(),
  /** Postgres schema octotally owns; ignored for SQLite. */
  DATABASE_SCHEMA: z.string().max(SCHEMA_MAX).regex(SCHEMA_RE).default('octotally'),
});

export type Env = z.infer<typeof EnvSchema> & { webDist: string };

const empty = (v: string | undefined) => (v === undefined || v === '' ? undefined : v);

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = EnvSchema.parse({
    PORT: empty(source.PORT),
    DATA_DIR: empty(source.DATA_DIR),
    GITHUB_TOKEN: empty(source.GITHUB_TOKEN),
    AUTH_PASSWORD: empty(source.AUTH_PASSWORD),
    API_TOKEN: empty(source.API_TOKEN),
    SESSION_SECRET: empty(source.SESSION_SECRET),
    LOG_LEVEL: empty(source.LOG_LEVEL),
    WEB_DIST: empty(source.WEB_DIST),
    DATABASE_URL: empty(source.DATABASE_URL),
    DATABASE_SCHEMA: empty(source.DATABASE_SCHEMA),
  });
  const webDist = path.resolve(parsed.WEB_DIST ?? path.resolve(import.meta.dir, '../../web/dist'));
  return { ...parsed, DATA_DIR: path.resolve(parsed.DATA_DIR), webDist };
}
