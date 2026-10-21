import type { Health } from '@octotally/shared';
import { Hono } from 'hono';
import type { AppDeps } from '../app';
import { VERSION } from '../version';

/** Always unauthenticated. 503 when the database does not answer. */
export function healthRoutes(deps: AppDeps) {
  const app = new Hono();
  app.get('/', async (c) => {
    const dbOk = await deps.dbh.ping();
    let status: Awaited<ReturnType<AppDeps['syncer']['status']>> | null = null;
    if (dbOk) {
      try {
        status = await deps.syncer.status(deps.poller.nextRunAt);
      } catch {
        status = null;
      }
    }
    const body: Health = {
      ok: dbOk,
      db: dbOk ? 'ok' : 'error',
      version: VERSION,
      lastSyncAt: status?.lastSyncAt ?? null,
      githubRateRemaining: status?.githubRateRemaining ?? null,
    };
    return c.json(body, dbOk ? 200 : 503);
  });
  return app;
}
