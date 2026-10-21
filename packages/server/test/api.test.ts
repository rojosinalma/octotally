import { describe, expect, test } from 'bun:test';
import { BUILTIN_VIEWS } from '@octotally/shared';
import { apiAllowed, createApp } from '../src/app';
import type { Env } from '../src/env';
import { issueSession } from '../src/lib/auth';
import { Poller } from '../src/lib/poller';
import { Syncer } from '../src/lib/sync';
import { StaticToken } from '../src/lib/token';
import { fakeGitHub, memDb, must, noSleep } from './helpers';

const SECRET = 's'.repeat(32);

function env(over: Partial<Env> = {}): Env {
  return {
    PORT: 0,
    DATA_DIR: '/nonexistent',
    LOG_LEVEL: 'silent',
    webDist: '/nonexistent/dist',
    ...over,
  } as Env;
}

async function build(envOver: Partial<Env> = {}, token: string | null = 't') {
  const dbh = await memDb();
  const tokens = new StaticToken(token);
  const syncer = new Syncer({ db: dbh.db, tokens, clientOptions: { fetch: fakeGitHub(), sleep: noSleep } });
  if (!token) syncer.noteNoToken('GITHUB_TOKEN not set');
  const poller = new Poller(dbh.db, syncer);
  const app = createApp({ env: env(envOver), dbh, syncer, poller, tokens, sessionSecret: SECRET });
  const req = async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const headers = new Headers(init.headers);
    let body = init.body;
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(init.json);
    }
    const res = await app.request(path, { ...init, headers, body });
    return {
      status: res.status,
      body: ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>,
      res,
    };
  };
  return { app, dbh, syncer, poller, req };
}

describe('auth middleware', () => {
  test('open when neither API_TOKEN nor AUTH_PASSWORD is set', async () => {
    expect(apiAllowed(env(), SECRET, undefined, undefined)).toBe(true);
  });
  test('API_TOKEN alone never locks the browser out; the bearer must match exactly', async () => {
    const e = env({ API_TOKEN: 'abc' });
    expect(apiAllowed(e, SECRET, undefined, undefined)).toBe(true);
    expect(apiAllowed(e, SECRET, 'Bearer abc', undefined)).toBe(true);
    expect(apiAllowed(e, SECRET, 'bearer abc', undefined)).toBe(true);
    const gated = env({ API_TOKEN: 'abc', AUTH_PASSWORD: 'pw' });
    expect(apiAllowed(gated, SECRET, 'Bearer ab', undefined)).toBe(false);
    expect(apiAllowed(gated, SECRET, 'Bearer abcd', undefined)).toBe(false);
    expect(apiAllowed(gated, SECRET, 'Basic abc', undefined)).toBe(false);
    expect(apiAllowed(gated, SECRET, 'Bearer abc', undefined)).toBe(true);
  });
  test('AUTH_PASSWORD: a valid cookie passes, a forged or expired one does not', async () => {
    const e = env({ AUTH_PASSWORD: 'pw' });
    expect(apiAllowed(e, SECRET, undefined, undefined)).toBe(false);
    expect(apiAllowed(e, SECRET, undefined, issueSession(SECRET))).toBe(true);
    expect(apiAllowed(e, SECRET, undefined, issueSession('other-secret'))).toBe(false);
    expect(apiAllowed(e, SECRET, undefined, issueSession(SECRET, Date.now() - 31 * 86_400_000))).toBe(false);
    expect(apiAllowed(e, SECRET, 'Bearer anything', undefined)).toBe(false);
  });
  test('both set: either credential works', async () => {
    const e = env({ AUTH_PASSWORD: 'pw', API_TOKEN: 'abc' });
    expect(apiAllowed(e, SECRET, 'Bearer abc', undefined)).toBe(true);
    expect(apiAllowed(e, SECRET, undefined, issueSession(SECRET))).toBe(true);
    expect(apiAllowed(e, SECRET, 'Bearer nope', 'garbage')).toBe(false);
  });

  test('HTTP: 401 envelope on /api, /health stays open', async () => {
    const { req } = await build({ API_TOKEN: 'x', AUTH_PASSWORD: 'pw' });
    const r = await req('/api/items');
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ ok: false, kind: 'auth', message: 'authentication required' });
    expect((await req('/health')).status).toBe(200);
    expect((await req('/api/items', { headers: { authorization: 'Bearer x' } })).status).toBe(200);
  });

  test('login flow issues a cookie that unlocks /api', async () => {
    const { req } = await build({ AUTH_PASSWORD: 'pw' });
    expect((await req('/auth/status')).body).toMatchObject({ authenticated: false, required: true });
    expect((await req('/auth/login', { method: 'POST', json: { password: 'no' } })).status).toBe(401);
    expect((await req('/auth/login', { method: 'POST', json: {} })).status).toBe(400);
    const ok = await req('/auth/login', { method: 'POST', json: { password: 'pw' } });
    expect(ok.status).toBe(200);
    const cookie = ok.res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('HttpOnly');
    const pair = cookie.split(';')[0] as string;
    expect((await req('/api/status', { headers: { cookie: pair } })).status).toBe(200);
    expect((await req('/auth/status', { headers: { cookie: pair } })).body).toMatchObject({
      authenticated: true,
    });
    const out = await req('/auth/logout', { method: 'POST', headers: { cookie: pair } });
    expect(out.res.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});

describe('api routes', () => {
  test('onboarding state without a token', async () => {
    const { req } = await build({}, null);
    const st = await req('/api/status');
    expect(st.body.ok).toBe(true);
    expect((st.body.status as Record<string, unknown>).githubLogin).toBeNull();
    expect((st.body.status as Record<string, unknown>).lastError).toMatch(/GITHUB_TOKEN/);
    expect((await req('/api/items')).body).toEqual({
      ok: true,
      message: 'ok',
      items: [],
      total: 0,
      query: '',
    });
    const h = await req('/health');
    expect(h.body).toMatchObject({ ok: true, db: 'ok', lastSyncAt: null });
  });

  test('items filter through the shared grammar after a sync', async () => {
    const { req, syncer } = await build();
    await syncer.run();
    const all = await req('/api/items?q=hidden:any');
    expect(all.body.total).toBe(4);
    const open = await req('/api/items?q=is:open%20-is:pr%20-linked:pr');
    const items = open.body.items as { id: string; type: string }[];
    expect(items.map((i) => i.type).sort()).toEqual(['discussion', 'issue']);
    expect((await req('/api/items?q=is:pr')).body.total).toBe(1);
    expect((await req('/api/items?q=is:merged')).body.total).toBe(1);
    expect((await req('/api/items?q=repo:other/thing')).body.total).toBe(1);
    expect((await req('/api/items?q=author:@me')).body.total).toBe(1);
    expect((await req('/api/items?q=role:reviewer')).body.total).toBe(1);
    expect((await req('/api/items?q=label:bug')).body.total).toBe(1);
    expect((await req('/api/items?q=energy')).body.total).toBe(1);
    expect((await req('/api/items?q=created:%3C2026-09-01')).body.total).toBe(1);
    expect((await req('/api/items?q=comments:%3E=3')).body.total).toBe(2);
    expect((await req('/api/items?q=comments:%3E={activityKeep}')).body.total).toBe(0); // {setting} substituted
  });

  test('mute / done / restore and hidden views', async () => {
    const { req, syncer } = await build();
    await syncer.run();
    const id = 'I_kwDOAbCdEf5xyz001';
    const m = await req(`/api/items/${id}/mute`, { method: 'POST' });
    expect(m.body).toMatchObject({ ok: true, item: { hidden: 'muted' } });
    expect((m.body.item as Record<string, unknown>).mutedActivityAt).not.toBeNull();
    expect((await req('/api/items?q=hidden:none')).body.total).toBe(3);
    expect((await req('/api/items?q=hidden:muted')).body.total).toBe(1);
    const d = await req(`/api/items/${id}/done`, { method: 'POST' });
    expect(d.body).toMatchObject({ item: { hidden: 'done', mutedActivityAt: null } });
    const r = await req(`/api/items/${id}/restore`, { method: 'POST' });
    expect(r.body).toMatchObject({ item: { hidden: 'none', hiddenAt: null } });
    expect((await req('/api/items/nope/mute', { method: 'POST' })).status).toBe(404);
    const one = await req(`/api/items/${id}`);
    expect(one.body).toMatchObject({ ok: true, item: { id }, activity: [] });
  });

  test('views: list, create, rename builtin, refuse builtin query edit/delete, delete custom', async () => {
    const { req } = await build();
    expect(((await req('/api/views')).body.views as unknown[]).length).toBe(BUILTIN_VIEWS.length);
    const c = await req('/api/views', { method: 'POST', json: { name: 'My Bugs', query: 'label:bug' } });
    expect(c.body).toMatchObject({ ok: true, view: { id: 'my-bugs', builtin: false, position: 4 } });
    expect((await req('/api/views', { method: 'POST', json: { name: 'My Bugs', query: 'x' } })).status).toBe(
      400,
    );
    expect((await req('/api/views', { method: 'POST', json: { name: '' } })).body.kind).toBe('validation');
    const ren = await req('/api/views/active', { method: 'PUT', json: { name: 'Hot', position: 9 } });
    expect(ren.body).toMatchObject({
      view: { name: 'Hot', position: 9, query: must(BUILTIN_VIEWS.find((v) => v.id === 'active')).query },
    });
    expect((await req('/api/views/active', { method: 'PUT', json: { query: 'is:pr' } })).status).toBe(400);
    expect((await req('/api/views/active', { method: 'DELETE' })).status).toBe(400);
    expect(
      (await req('/api/views/my-bugs', { method: 'PUT', json: { query: 'label:bug is:open' } })).body,
    ).toMatchObject({ view: { query: 'label:bug is:open' } });
    expect((await req('/api/views/my-bugs', { method: 'DELETE' })).body).toMatchObject({
      ok: true,
      id: 'my-bugs',
    });
    expect((await req('/api/views/my-bugs', { method: 'DELETE' })).status).toBe(404);
  });

  test('settings: get, patch one key, validation errors', async () => {
    const { req } = await build();
    const before = (await req('/api/settings')).body.settings as Record<string, unknown>;
    expect(before.pollIntervalMin).toBe(15);
    const p = await req('/api/settings', { method: 'PUT', json: { pollIntervalMin: 5 } });
    expect(p.body).toMatchObject({ ok: true, settings: { pollIntervalMin: 5, activeWindowDays: 30 } });
    const bad = await req('/api/settings', { method: 'PUT', json: { pollIntervalMin: 0, theme: 'neon' } });
    expect(bad.status).toBe(400);
    expect(bad.body.kind).toBe('validation');
    expect(bad.body.message).toMatch(/pollIntervalMin/);
    expect(bad.body.message).toMatch(/theme/);
    expect((await req('/api/settings', { method: 'PUT', json: { timezone: 'Mars/Olympus' } })).status).toBe(
      400,
    );
    expect((await req('/api/settings', { method: 'PUT', json: { timezone: 'Europe/Berlin' } })).status).toBe(
      200,
    );
    expect(((await req('/api/settings')).body.settings as Record<string, unknown>).pollIntervalMin).toBe(5);
  });

  test('refresh kicks a sync and coalesces; repos, notifiers, version, 404', async () => {
    const { req, syncer } = await build();
    const r = await req('/api/refresh', { method: 'POST' });
    expect(r.body).toMatchObject({ ok: true, started: true });
    while (syncer.isRunning) await new Promise((res) => setTimeout(res, 5));
    await new Promise((res) => setTimeout(res, 20));
    expect(((await req('/api/status')).body.status as Record<string, unknown>).itemCount).toBe(4);
    const repos = (await req('/api/repos')).body.repos as { repo: string; count: number }[];
    expect(repos[0]).toEqual({ repo: 'acme/widgets', count: 3 });
    expect(((await req('/api/notifiers')).body.notifiers as unknown[])[0]).toMatchObject({
      name: 'discord',
      configured: false,
    });
    expect((await req('/api/notifiers/discord/test', { method: 'POST' })).status).toBe(400);
    expect((await req('/api/notifiers/pigeon/test', { method: 'POST' })).status).toBe(404);
    expect((await req('/api/version')).body).toMatchObject({ ok: true });
    expect((await req('/api/nothing')).status).toBe(404);
    expect((await req('/api/nothing')).body.kind).toBe('not_found');
  });

  test('/health answers 503 with db: error when the database is gone', async () => {
    const { req, dbh } = await build();
    await dbh.close();
    const h = await req('/health');
    expect(h.status).toBe(503);
    expect(h.body).toMatchObject({ ok: false, db: 'error', lastSyncAt: null });
  });

  test('SPA fallback: 404 text when the dist is missing', async () => {
    const { app } = await build();
    const res = await app.request('/some/route');
    expect(res.status).toBe(404);
  });
});
