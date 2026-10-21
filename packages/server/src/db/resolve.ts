import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { type DbTarget, engineOf, redactUrl, toTarget } from './target';

/** Written by an Octoforge adoption; overrides DATABASE_URL / DATABASE_SCHEMA at start-up. */
export const ADOPTION_FILE = 'octoforge-database.json';
export const DEFAULT_SCHEMA = 'octotally';

const AdoptionFile = z.object({
  url: z
    .string()
    .refine((u) => engineOf(u) !== null, 'must start with postgres://, postgresql:// or sqlite:'),
  schema: z.string().nullish(),
});
export type AdoptionFile = z.infer<typeof AdoptionFile>;

export interface DatabaseEnv {
  DATA_DIR: string;
  DATABASE_URL?: string | undefined;
  DATABASE_SCHEMA?: string | undefined;
}

export function adoptionFilePath(dataDir: string): string {
  return path.join(dataDir, ADOPTION_FILE);
}

/**
 * Reads the adoption file; null when there is none. A file that exists but does not parse throws:
 * falling back to the local database would split writes between two databases without anyone noticing.
 */
export function readAdoptionFile(dataDir: string): AdoptionFile | null {
  const file = adoptionFilePath(dataDir);
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`${file}: cannot read (${(err as Error).message})`);
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `${file}: not valid JSON (${(err as Error).message}); fix it or delete it to use DATABASE_URL`,
    );
  }
  const parsed = AdoptionFile.safeParse(json);
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join('.') || 'file'}: ${i.message}`).join('; ');
    throw new Error(`${file}: ${why}; fix it or delete it to use DATABASE_URL`);
  }
  return parsed.data;
}

/** Writes the adoption file atomically (temp file in the same directory, then rename), mode 0600. */
export function writeAdoptionFile(dataDir: string, content: { url: string; schema: string | null }): void {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = adoptionFilePath(dataDir);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(content, null, 2)}\n`, { mode: 0o600 });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

/**
 * Which database to open: the adoption file, else DATABASE_URL (+ DATABASE_SCHEMA), else SQLite at
 * `DATA_DIR/octotally.db`. Throws with a reason on a malformed file, URL or schema name (fail fast).
 */
export function resolveDatabase(env: DatabaseEnv): DbTarget {
  const adopted = readAdoptionFile(env.DATA_DIR);
  try {
    if (adopted) return toTarget(adopted.url, adopted.schema ?? DEFAULT_SCHEMA, 'octoforge');
  } catch (err) {
    throw new Error(`${adoptionFilePath(env.DATA_DIR)}: ${(err as Error).message}`);
  }
  if (env.DATABASE_URL) {
    const url = env.DATABASE_URL;
    if (!engineOf(url)) {
      throw new Error(
        `DATABASE_URL ${redactUrl(url)}: must start with postgres://, postgresql:// or sqlite:`,
      );
    }
    return toTarget(url, env.DATABASE_SCHEMA ?? DEFAULT_SCHEMA, 'env');
  }
  return toTarget(path.join(env.DATA_DIR, 'octotally.db'), null, 'none');
}
