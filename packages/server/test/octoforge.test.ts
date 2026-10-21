import { afterEach, describe, expect, mock, test } from 'bun:test';
import { OctoforgeManifest } from '@octotally/shared';
import { eq } from 'drizzle-orm';
import manifestFile from '../../../octoforge.json';
import rootPkg from '../../../package.json';
import { createApp } from '../src/app';
import { settings as settingsTable } from '../src/db/schema';
import type { Env } from '../src/env';
import { issueSession } from '../src/lib/auth';
import { CredentialStore, DELIVERED_TOKEN_KEY } from '../src/lib/octoforge/credentials';
import { DatabaseError } from '../src/lib/octoforge/database';
import { Poller } from '../src/lib/poller';
import { Syncer } from '../src/lib/sync';
import { LayeredToken } from '../src/lib/token';
import { configureLog } from '../src/log';
import type { OctoforgeDeps } from '../src/routes/octoforge';
import { fakeGitHub, memDb, noSleep } from './helpers';

const SECRET = 's'.repeat(32);
const FORGE = 'forge-token-0123456789abcdef';
const ENV_TOKEN = 'ghp_envtoken000000000000000000000000';
const GOOD = 'ghp_delivered11111111111111111111111';
const auth = (t = FORGE) => ({ authorization: `Bearer ${t}` });

function env(over: Partial<Env> = {}): Env {
  return {
    PORT: 0,
    DATA_DIR: '/nonexistent',
    LOG_LEVEL: 'silent',
    webDist: '/nonexistent/dist',
    ...over,
  } as Env;
}

/** GitHub REST stand-in for `GET /user`, keyed by the token in the authorization header. */
function fakeRest(calls: string[] = []): typeof fetch {
  const handler = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push(String(url));
    const token = new Headers(init?.headers).get('authorization')?.replace(/^bearer /i, '') ?? '';
    const json = (status: number, v: unknown) =>
      new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } });
    if (token === GOOD) return json(200, { login: 'octocat', type: 'User', id: 1 });
    if (token.startsWith('ghp_bot')) return json(200, { login: 'ci[bot]', type: 'Bot' });
    if (token.startsWith('ghp_down')) return json(503, { message: 'unavailable' });
    if (token.startsWith('ghp_offline')) throw new TypeError('connection refused');
    return json(401, { message: 'Bad credentials' });
  };
  return handler as unknown as typeof fetch;
}

interface BuildOpts {
  env?: Partial<Env>;
  envToken?: string;
  seams?: OctoforgeDeps;
  secret?: string;
}

function build(opts: BuildOpts = {}) {
  const dbh = memDb();
  const credentials = new CredentialStore(dbh.db, opts.secret ?? SECRET);
  const tokens = new LayeredToken(() => credentials.token(), opts.envToken);
  const syncer = new Syncer({ db: dbh.db, tokens, clientOptions: { fetch: fakeGitHub(), sleep: noSleep } });
  const poller = new Poller(dbh.db, syncer);
  let cycles = 0;
  const cycle = poller.cycle.bind(poller);
  poller.cycle = async () => {
    cycles += 1;
    return cycle();
  };
  const app = createApp({
    env: env({ OCTOFORGE_TOKEN: FORGE, ...opts.env }),
    dbh,
    syncer,
    poller,
    tokens,
    sessionSecret: opts.secret ?? SECRET,
    octoforge: { credentials, fetch: fakeRest(), ...opts.seams },
  });
  const req = async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const headers = new Headers(init.headers);
    let body = init.body;
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(init.json);
    }
    const res = await app.request(path, { ...init, headers, body });
    const text = await res.text();
    return { status: res.status, text, body: (JSON.parse(text || '{}') ?? {}) as Record<string, unknown> };
  };
  const rawRow = () =>
    dbh.db.select().from(settingsTable).where(eq(settingsTable.key, DELIVERED_TOKEN_KEY)).get();
  return { app, dbh, syncer, poller, tokens, credentials, req, rawRow, cycles: () => cycles };
}

/** Captures every log line written while `fn` runs (the loggers must be created inside it). */
function captureLogs(): string[] {
  const lines: string[] = [];
  configureLog('trace', { write: (line: string) => void lines.push(line) });
  return lines;
}

afterEach(() => {
  configureLog('silent');
});

describe('manifest', () => {
  test('octoforge.json validates against the contract schema and matches package.json', () => {
    const m = OctoforgeManifest.parse(manifestFile);
    expect(m.contract).toBe(1);
    expect(m.name).toBe('octotally');
    expect(m.description).toBe(rootPkg.description);
    expect(m.github?.auth).toEqual(['pat']);
    expect(m.github?.app).toBeUndefined();
    expect(m.github?.pat?.user_identity).toBe(true);
    expect(m.database).toEqual({ engines: ['sqlite', 'postgres'], schema: true });
  });

  test('served without a bearer, even with AUTH_PASSWORD set', async () => {
    const { req } = build({ env: { AUTH_PASSWORD: 'pw' } });
    const r = await req('/api/octoforge/manifest');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(manifestFile as unknown as Record<string, unknown>);
  });
});

describe('without OCTOFORGE_TOKEN', () => {
  test('every octoforge route is 404 and /api behaves as before', async () => {
    const { req } = build({ env: { OCTOFORGE_TOKEN: undefined }, envToken: ENV_TOKEN });
    for (const [method, path] of [
      ['GET', '/api/octoforge/manifest'],
      ['GET', '/api/octoforge/status'],
      ['PUT', '/api/octoforge/github'],
      ['DELETE', '/api/octoforge/github'],
      ['POST', '/api/octoforge/database/adopt'],
      ['DELETE', '/api/octoforge/database'],
      ['GET', '/api/octoforge'],
    ] as const) {
      const r = await req(path, { method, headers: auth() });
      expect(r.status, `${method} ${path}`).toBe(404);
      expect(r.body.kind).toBe('not_found');
    }
    expect((await req('/api/items')).status).toBe(200);
    expect((await req('/api/status')).body.tokenSource).toBe('GITHUB_TOKEN (env)');
  });

  test('with AUTH_PASSWORD the /api gate is unchanged', async () => {
    const { req } = build({ env: { OCTOFORGE_TOKEN: undefined, AUTH_PASSWORD: 'pw' } });
    expect((await req('/api/items')).status).toBe(401);
    const cookie = `octotally_session=${issueSession(SECRET)}`;
    expect((await req('/api/items', { headers: { cookie } })).status).toBe(200);
  });
});

describe('bearer', () => {
  test('401 without, with a wrong or with the API_TOKEN bearer; unknown paths 404 behind it', async () => {
    const { req } = build({ env: { API_TOKEN: 'api-token' } });
    expect((await req('/api/octoforge/status')).status).toBe(401);
    expect((await req('/api/octoforge/status', { headers: auth('nope') })).status).toBe(401);
    expect((await req('/api/octoforge/status', { headers: auth(`${FORGE}x`) })).status).toBe(401);
    expect((await req('/api/octoforge/status', { headers: auth('api-token') })).status).toBe(401);
    expect((await req('/api/octoforge/nope')).status).toBe(401);
    const r = await req('/api/octoforge/nope', { headers: auth() });
    expect(r.status).toBe(404);
    expect(r.body.kind).toBe('not_found');
  });

  test('AUTH_PASSWORD set: the octoforge bearer works, the session cookie does not', async () => {
    const { req } = build({ env: { AUTH_PASSWORD: 'pw' } });
    expect((await req('/api/octoforge/status', { headers: auth() })).status).toBe(200);
    const cookie = `octotally_session=${issueSession(SECRET)}`;
    expect((await req('/api/octoforge/status', { headers: { cookie } })).status).toBe(401);
    // and the octoforge bearer opens nothing else
    expect((await req('/api/items', { headers: auth() })).status).toBe(401);
  });
});

describe('GET /status', () => {
  test('shape and no secret', async () => {
    const { req } = build({ envToken: ENV_TOKEN });
    const r = await req('/api/octoforge/status', { headers: auth() });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      ok: true,
      contract: 1,
      version: rootPkg.version,
      github: { mode: 'pat', source: 'env' },
      database: { engine: 'sqlite', source: 'none' },
    });
    expect(r.text).not.toContain(ENV_TOKEN);
    expect(r.text).not.toContain(FORGE);
  });

  test('no token anywhere: mode null, source none', async () => {
    const { req } = build();
    const r = await req('/api/octoforge/status', { headers: auth() });
    expect(r.body.github).toEqual({ mode: null, source: 'none' });
  });

  test('database part comes from databaseStatus', async () => {
    const status = mock(() => ({
      engine: 'postgres' as const,
      schema: 'octotally',
      source: 'octoforge' as const,
    }));
    const { req, dbh } = build({ seams: { database: { status } } });
    const r = await req('/api/octoforge/status', { headers: auth() });
    expect(r.body.database).toEqual({ engine: 'postgres', schema: 'octotally', source: 'octoforge' });
    expect(status).toHaveBeenCalledWith(dbh);
  });
});

describe('PUT /github', () => {
  test('valid user token: stored encrypted, wins over env, triggers a sync, never echoed or logged', async () => {
    const lines = captureLogs();
    const { req, rawRow, tokens, syncer, cycles } = build({ envToken: ENV_TOKEN });
    const r = await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'pat', token: GOOD },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, login: 'octocat', restart_required: false });
    expect(r.text).not.toContain(GOOD);

    const row = rawRow();
    expect(row).toBeDefined();
    expect(row?.value).not.toContain(GOOD);
    expect(row?.value).not.toContain(Buffer.from(GOOD).toString('base64url'));
    expect(JSON.parse(row?.value ?? '{}')).toMatchObject({ v: 1, login: 'octocat' });

    expect(await tokens.getToken()).toBe(GOOD);
    expect(tokens.describe()).toBe('token delivered by Octoforge');
    expect(cycles()).toBe(1);
    while (syncer.isRunning) await Bun.sleep(5);

    const status = await req('/api/octoforge/status', { headers: auth() });
    expect(status.body.github).toEqual({ mode: 'pat', source: 'octoforge', login: 'octocat' });
    for (const path of ['/api/settings', '/api/status']) {
      const other = await req(path);
      expect(other.text).not.toContain(GOOD);
      expect(other.text).not.toContain(DELIVERED_TOKEN_KEY);
    }
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toContain(GOOD);
      expect(line).not.toContain(FORGE);
    }
  });

  test('PUT /api/settings cannot write the delivered key', async () => {
    const { req, rawRow } = build();
    const r = await req('/api/settings', {
      method: 'PUT',
      json: { [DELIVERED_TOKEN_KEY]: 'x', theme: 'light' },
    });
    expect(r.status).toBe(200);
    expect(rawRow()).toBeUndefined();
  });

  test('rejected tokens: bad credentials, non-user, GitHub down, unreachable', async () => {
    const lines = captureLogs();
    const { req, rawRow } = build();
    const put = (token: string) =>
      req('/api/octoforge/github', { method: 'PUT', headers: auth(), json: { mode: 'pat', token } });

    const bad = await put('ghp_bad000000');
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('GitHub rejected the token: Bad credentials');

    const bot = await put('ghp_bot000000');
    expect(bot.status).toBe(400);
    expect(String(bot.body.message)).toContain('user account');

    const down = await put('ghp_down000000');
    expect(down.status).toBe(502);
    expect(down.body.kind).toBe('upstream');

    const offline = await put('ghp_offline000');
    expect(offline.status).toBe(502);

    expect(rawRow()).toBeUndefined();
    for (const r of [bad, bot, down, offline]) expect(r.text).not.toMatch(/ghp_\w+0{3}/);
    for (const line of lines) expect(line).not.toMatch(/ghp_\w+0{3}/);
  });

  test('body validation: mode app, missing token, junk; the token never shows in the message', async () => {
    const { req } = build();
    const app = await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'app', app_id: 1, private_key: 'pem' },
    });
    expect(app.status).toBe(400);
    expect(app.body.message).toBe('octotally supports only pat');

    const missing = await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'pat' },
    });
    expect(missing.status).toBe(400);

    const secret = `ghp_${'x'.repeat(600)}`;
    const long = await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'pat', token: secret },
    });
    expect(long.status).toBe(400);
    expect(long.text).not.toContain(secret);

    const junk = await req('/api/octoforge/github', { method: 'PUT', headers: auth(), body: 'not json' });
    expect(junk.status).toBe(400);
  });

  test('a token delivered when none existed at boot starts syncing', async () => {
    const { req, syncer, poller } = build();
    syncer.noteNoToken('GITHUB_TOKEN not set');
    expect(syncer.status(poller.nextRunAt).lastError).toBe('GITHUB_TOKEN not set');
    await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'pat', token: GOOD },
    });
    while (syncer.isRunning) await Bun.sleep(5);
    const status = syncer.status(poller.nextRunAt);
    expect(status.lastError).toBeNull();
    expect(status.lastSyncOk).toBe(true);
  });
});

describe('DELETE /github', () => {
  test('falls back to GITHUB_TOKEN', async () => {
    const { req, tokens, rawRow } = build({ envToken: ENV_TOKEN });
    await req('/api/octoforge/github', {
      method: 'PUT',
      headers: auth(),
      json: { mode: 'pat', token: GOOD },
    });
    const r = await req('/api/octoforge/github', { method: 'DELETE', headers: auth() });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, restart_required: false });
    expect(rawRow()).toBeUndefined();
    expect(await tokens.getToken()).toBe(ENV_TOKEN);
    expect(tokens.describe()).toBe('GITHUB_TOKEN (env)');
    const status = await req('/api/octoforge/status', { headers: auth() });
    expect((status.body.github as { source: string }).source).toBe('env');
  });

  test('no env token: back to the onboarding state', async () => {
    const { req, tokens, syncer, poller } = build();
    const r = await req('/api/octoforge/github', { method: 'DELETE', headers: auth() });
    expect(r.status).toBe(200);
    expect(await tokens.getToken()).toBeNull();
    expect(syncer.status(poller.nextRunAt).lastError).toContain('GITHUB_TOKEN not set');
  });
});

describe('credential store', () => {
  test('a rotated session secret falls back to the env token and warns without the value', async () => {
    const lines = captureLogs();
    const dbh = memDb();
    await new CredentialStore(dbh.db, SECRET).save(GOOD, 'octocat');
    const rotated = new CredentialStore(dbh.db, 'r'.repeat(32));
    const tokens = new LayeredToken(() => rotated.token(), ENV_TOKEN);
    expect(await tokens.getToken()).toBe(ENV_TOKEN);
    expect(await tokens.getToken()).toBe(ENV_TOKEN);
    expect(await tokens.source()).toBe('env');
    const warnings = lines.filter((l) => l.includes('cannot be decrypted'));
    expect(warnings).toHaveLength(1);
    for (const line of lines) expect(line).not.toContain(GOOD);
  });

  test('each write uses a fresh IV', async () => {
    const dbh = memDb();
    const store = new CredentialStore(dbh.db, SECRET);
    const read = () =>
      dbh.db.select().from(settingsTable).where(eq(settingsTable.key, DELIVERED_TOKEN_KEY)).get()?.value;
    await store.save(GOOD, 'octocat');
    const first = read();
    await store.save(GOOD, 'octocat');
    expect(read()).not.toBe(first);
    expect(await store.token()).toBe(GOOD);
  });
});

describe('database routes', () => {
  const URL_WITH_PASSWORD = 'postgres://octotally:hunter2secret@db.example:5432/forge';

  test('adopt calls adoptDatabase with defaults and answers restart_required', async () => {
    const adopt = mock(async () => ({ tables: { items: 3, settings: 2 } }));
    const { req, dbh } = build({ env: { DATA_DIR: '/data' }, seams: { database: { adopt } } });
    const r = await req('/api/octoforge/database/adopt', {
      method: 'POST',
      headers: auth(),
      json: { url: URL_WITH_PASSWORD },
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, tables: { items: 3, settings: 2 }, restart_required: true });
    expect(adopt).toHaveBeenCalledWith(
      dbh,
      { url: URL_WITH_PASSWORD, schema: 'octotally', copy: true },
      '/data',
    );
    expect(r.text).not.toContain('hunter2secret');
  });

  test('adopt validation: scheme and schema name', async () => {
    const adopt = mock(async () => ({ tables: {} }));
    const { req } = build({ seams: { database: { adopt } } });
    const post = (json: unknown) =>
      req('/api/octoforge/database/adopt', { method: 'POST', headers: auth(), json });
    const mysql = await post({ url: 'mysql://u:hunter2secret@h/db' });
    expect(mysql.status).toBe(400);
    expect(mysql.text).not.toContain('hunter2secret');
    expect((await post({ url: 'sqlite:/shared/octotally.db', schema: 'Bad-Name' })).status).toBe(400);
    expect((await post({ url: 'sqlite:/shared/octotally.db', copy: 'yes' })).status).toBe(400);
    const ok = await post({ url: 'sqlite:/shared/octotally.db', schema: 'tally_2', copy: false });
    expect(ok.status).toBe(200);
    expect(adopt).toHaveBeenCalledTimes(1);
  });

  test('DatabaseError kinds map to the envelope, the URL and password are scrubbed', async () => {
    const lines = captureLogs();
    for (const [kind, status] of [
      ['validation', 400],
      ['upstream', 502],
      ['system', 500],
    ] as const) {
      const adopt = mock(async () => {
        throw new DatabaseError(`cannot reach ${URL_WITH_PASSWORD} (password hunter2secret)`, kind);
      });
      const { req } = build({ seams: { database: { adopt } } });
      const r = await req('/api/octoforge/database/adopt', {
        method: 'POST',
        headers: auth(),
        json: { url: URL_WITH_PASSWORD },
      });
      expect(r.status).toBe(status);
      expect(r.body.kind).toBe(kind);
      expect(r.text).not.toContain('hunter2secret');
      expect(r.text).not.toContain('db.example');
    }
    const crash = mock(async () => {
      throw new Error(`boom ${URL_WITH_PASSWORD}`);
    });
    const { req } = build({ seams: { database: { adopt: crash } } });
    const r = await req('/api/octoforge/database/adopt', {
      method: 'POST',
      headers: auth(),
      json: { url: URL_WITH_PASSWORD },
    });
    expect(r.status).toBe(500);
    expect(r.text).not.toContain('hunter2secret');
    for (const line of lines) expect(line).not.toContain('hunter2secret');
  });

  test('DELETE /database calls dropAdoptedDatabase', async () => {
    const drop = mock(async () => ({ removed: true }));
    const { req } = build({ env: { DATA_DIR: '/data' }, seams: { database: { drop } } });
    const r = await req('/api/octoforge/database', { method: 'DELETE', headers: auth() });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, removed: true, restart_required: true });
    expect(drop).toHaveBeenCalledWith('/data');

    const failing = mock(async () => {
      throw new DatabaseError('read-only data dir', 'system');
    });
    const b = build({ seams: { database: { drop: failing } } });
    const f = await b.req('/api/octoforge/database', { method: 'DELETE', headers: auth() });
    expect(f.status).toBe(500);
    expect(f.body.message).toBe('read-only data dir');
  });
});
