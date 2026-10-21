import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { DbHandle } from './db';
import type { Env } from './env';
import { bearerToken, SESSION_COOKIE, safeEqual, verifySession } from './lib/auth';
import type { Poller } from './lib/poller';
import type { Syncer } from './lib/sync';
import type { TokenSource } from './lib/token';
import { errInfo, log } from './log';
import { apiRoutes } from './routes/api';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { type OctoforgeDeps, octoforgeRoutes } from './routes/octoforge';
import { jsonErr } from './routes/respond';

export interface AppDeps {
  env: Env;
  dbh: DbHandle;
  syncer: Syncer;
  poller: Poller;
  tokens: TokenSource;
  sessionSecret: string;
  /** Octoforge member routes: shared credential store and test seams. */
  octoforge?: OctoforgeDeps;
}

/**
 * Auth decision for /api/*:
 *  - a bearer matching API_TOKEN (when set) → allowed, always
 *  - AUTH_PASSWORD set → a valid session cookie is required for everything else
 *  - AUTH_PASSWORD not set → open (document: put it behind your proxy's auth);
 *    API_TOKEN alone adds a machine credential without locking the browser out
 *  - otherwise 401. `/health` and `/auth/*` never go through this.
 */
export function apiAllowed(
  env: Env,
  secret: string,
  auth: string | undefined,
  cookie: string | undefined,
): boolean {
  if (env.API_TOKEN) {
    const token = bearerToken(auth);
    if (token && safeEqual(token, env.API_TOKEN)) return true;
  }
  if (!env.AUTH_PASSWORD) return true;
  return verifySession(secret, cookie);
}

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const http = log('http');

  app.use('*', async (c, next) => {
    const started = Date.now();
    await next();
    http.info(
      { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - started },
      'request',
    );
  });

  app.onError((err, c) => {
    http.error({ err: errInfo(err), path: c.req.path }, 'unhandled error');
    return jsonErr(c, 'system', err instanceof Error ? err.message : 'internal error');
  });

  app.route('/health', healthRoutes(deps));
  app.route('/auth', authRoutes(deps));
  // Own bearer (OCTOFORGE_TOKEN), registered before the /api gate so that gate never applies here.
  app.route('/api/octoforge', octoforgeRoutes(deps));

  app.use('/api/*', async (c, next) => {
    if (
      apiAllowed(deps.env, deps.sessionSecret, c.req.header('authorization'), getCookie(c, SESSION_COOKIE))
    ) {
      return next();
    }
    return jsonErr(c, 'auth', 'authentication required');
  });
  app.route('/api', apiRoutes(deps));
  app.all('/api/*', (c) => jsonErr(c, 'not_found', `no route for ${c.req.method} ${c.req.path}`));

  // Static SPA with index.html fallback. The bundle holds no data; the API behind it is what is gated.
  const dist = deps.env.webDist;
  const indexFile = path.join(dist, 'index.html');
  const hasDist = fs.existsSync(indexFile);
  if (!hasDist) log('boot').warn({ dist }, 'web dist not found; only /api, /auth and /health are served');

  app.get('*', async (c) => {
    if (!hasDist) return c.text('octotally server is running; web UI not built (WEB_DIST missing)', 404);
    const rel = decodeURIComponent(new URL(c.req.url).pathname);
    const target = path.resolve(dist, `.${rel}`);
    if (target.startsWith(dist) && target !== dist) {
      const file = Bun.file(target);
      if (await file.exists()) {
        const immutable = rel.startsWith('/assets/');
        return new Response(file, {
          headers: { 'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' },
        });
      }
    }
    return new Response(Bun.file(indexFile), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
    });
  });

  return app;
}
