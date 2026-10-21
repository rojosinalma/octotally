import type { OctoforgeStatus } from '@octotally/shared';
import { type Context, Hono } from 'hono';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { bearerToken, safeEqual } from '../lib/auth';
import { GitHubError } from '../lib/github/client';
import { fetchTokenUser } from '../lib/github/user';
import { CredentialStore } from '../lib/octoforge/credentials';
import { adoptDatabase, DatabaseError, databaseStatus, dropAdoptedDatabase } from '../lib/octoforge/database';
import { MANIFEST } from '../lib/octoforge/manifest';
import { log } from '../log';
import { VERSION } from '../version';
import { jsonErr, jsonOk, zodMessage } from './respond';

/** Test seams; production builds every part from `AppDeps`. */
export interface OctoforgeDeps {
  credentials?: CredentialStore;
  /** fetch used for the GitHub token check (`GET /user`). */
  fetch?: typeof fetch;
  database?: Partial<{
    status: typeof databaseStatus;
    adopt: typeof adoptDatabase;
    drop: typeof dropAdoptedDatabase;
  }>;
}

const GithubBody = z.object({
  mode: z.literal('pat'),
  token: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(/^[\x21-\x7e]+$/, 'must be printable ASCII'),
});

const AdoptBody = z.object({
  url: z
    .string()
    .regex(/^(postgres(ql)?:\/\/|sqlite:)/, 'must start with postgres://, postgresql:// or sqlite:'),
  schema: z
    .string()
    .max(63)
    .regex(/^[a-z_][a-z0-9_]*$/, 'must match ^[a-z_][a-z0-9_]*$')
    .default(MANIFEST.name),
  copy: z.boolean().default(true),
});

const NO_TOKEN = 'GITHUB_TOKEN not set: add a GitHub token to start syncing';

/**
 * Octoforge member contract v1 under /api/octoforge. Mounted before the /api gate: these routes
 * never use API_TOKEN or the session cookie. Without OCTOFORGE_TOKEN every route answers 404;
 * with it, everything but the manifest needs `Authorization: Bearer <OCTOFORGE_TOKEN>`.
 */
export function octoforgeRoutes(deps: AppDeps) {
  const app = new Hono();
  const logger = log('octoforge');
  const notFound = (c: Context) => jsonErr(c, 'not_found', `no route for ${c.req.method} ${c.req.path}`);
  const expected = deps.env.OCTOFORGE_TOKEN;
  if (!expected) {
    app.all('*', notFound);
    return app;
  }

  const seams = deps.octoforge ?? {};
  const credentials = seams.credentials ?? new CredentialStore(deps.dbh.db, deps.sessionSecret);
  const database = {
    status: databaseStatus,
    adopt: adoptDatabase,
    drop: dropAdoptedDatabase,
    ...seams.database,
  };

  app.get('/manifest', (c) => c.json(MANIFEST));

  app.use('*', async (c, next) => {
    const token = bearerToken(c.req.header('authorization'));
    if (token && safeEqual(token, expected)) return next();
    logger.warn({ method: c.req.method, path: c.req.path }, 'octoforge bearer missing or wrong');
    return jsonErr(c, 'auth', 'Octoforge token required');
  });

  app.get('/status', async (c) => {
    const source = await deps.tokens.source();
    const login =
      source === 'octoforge'
        ? (await credentials.load())?.login
        : source === 'env'
          ? deps.syncer.status(deps.poller.nextRunAt).githubLogin
          : null;
    const status: OctoforgeStatus = {
      contract: MANIFEST.contract,
      version: VERSION,
      github: { mode: source === 'none' ? null : 'pat', source, ...(login ? { login } : {}) },
      database: database.status(deps.dbh),
    };
    return jsonOk(c, 'ok', status);
  });

  app.put('/github', async (c) => {
    const raw: unknown = await c.req.json().catch(() => null);
    if (raw && typeof raw === 'object' && (raw as { mode?: unknown }).mode === 'app') {
      return jsonErr(c, 'validation', 'octotally supports only pat');
    }
    const parsed = GithubBody.safeParse(raw);
    if (!parsed.success) return jsonErr(c, 'validation', zodMessage(parsed.error));
    const { token } = parsed.data;

    let user: Awaited<ReturnType<typeof fetchTokenUser>>;
    try {
      user = await fetchTokenUser(token, seams.fetch ? { fetch: seams.fetch } : {});
    } catch (err) {
      if (err instanceof GitHubError && err.kind === 'auth') {
        return jsonErr(c, 'validation', `GitHub rejected the token: ${err.message}`);
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ message }, 'token check against GitHub failed');
      return jsonErr(c, 'upstream', message);
    }
    if (user.type !== 'User') {
      return jsonErr(c, 'validation', `the token must belong to a user account, not a ${user.type}`);
    }

    await credentials.save(token, user.login);
    logger.info({ login: user.login }, 'GitHub token delivered');
    // Start syncing with the new token now; a sync in flight finishes with the old one.
    if (!deps.syncer.isRunning) void deps.poller.cycle();
    return jsonOk(c, `token for ${user.login} stored`, { login: user.login, restart_required: false });
  });

  app.delete('/github', async (c) => {
    const removed = await credentials.clear();
    const source = await deps.tokens.source();
    if (source === 'none') deps.syncer.noteNoToken(NO_TOKEN);
    logger.info({ removed, source }, 'delivered GitHub token dropped');
    const fallback = source === 'none' ? 'GITHUB_TOKEN is not set' : 'using GITHUB_TOKEN';
    const message = removed ? `delivered token removed; ${fallback}` : `no delivered token; ${fallback}`;
    return jsonOk(c, message, { restart_required: false });
  });

  app.post('/database/adopt', async (c) => {
    const parsed = AdoptBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return jsonErr(c, 'validation', zodMessage(parsed.error));
    const body = parsed.data;
    try {
      const { tables } = await database.adopt(deps.dbh, body, deps.env.DATA_DIR);
      logger.info(
        { engine: engineOf(body.url), schema: body.schema, copy: body.copy, tables },
        'database adopted; restart required',
      );
      return jsonOk(c, 'database adopted; restart to use it', { tables, restart_required: true });
    } catch (err) {
      return databaseFailure(c, 'database adoption failed', err, body.url);
    }
  });

  app.delete('/database', async (c) => {
    try {
      const { removed } = await database.drop(deps.env.DATA_DIR);
      logger.info({ removed }, 'adopted database setting dropped; restart required');
      const message = removed
        ? 'adopted database removed; restart to use DATABASE_URL'
        : 'no adopted database; DATABASE_URL stays in use';
      return jsonOk(c, message, { removed, restart_required: true });
    } catch (err) {
      return databaseFailure(c, 'dropping the adopted database failed', err);
    }
  });

  app.all('*', notFound);
  return app;

  function databaseFailure(c: Context, what: string, err: unknown, url?: string) {
    const message = scrub(err instanceof Error ? err.message : String(err), url);
    if (err instanceof DatabaseError) {
      logger.warn({ kind: err.kind, message }, what);
      return jsonErr(c, err.kind, message);
    }
    logger.error({ message, stack: err instanceof Error ? scrub(err.stack ?? '', url) : undefined }, what);
    return jsonErr(c, 'system', `${what}: ${message}`);
  }
}

function engineOf(url: string): 'sqlite' | 'postgres' {
  return url.startsWith('sqlite:') ? 'sqlite' : 'postgres';
}

/** Removes the URL and its password from a message before it reaches a log line or an answer. */
function scrub(text: string, url: string | undefined): string {
  if (!url) return text;
  const secrets = [url];
  try {
    const password = new URL(url).password;
    if (password) secrets.push(password, decodeURIComponent(password));
  } catch {
    // not a URL: the whole string is already covered
  }
  let out = text;
  for (const s of secrets) if (s) out = out.split(s).join('***');
  return out;
}
