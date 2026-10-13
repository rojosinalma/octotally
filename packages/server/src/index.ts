import path from 'node:path';
import { createApp } from './app';
import { openDb } from './db';
import { loadEnv } from './env';
import { loadSessionSecret } from './lib/auth';
import { Poller } from './lib/poller';
import { seedViews } from './lib/settings';
import { Syncer } from './lib/sync';
import { EnvToken } from './lib/token';
import { configureLog, errInfo, log } from './log';
import { VERSION } from './version';

const env = loadEnv();
configureLog(env.LOG_LEVEL);
const boot = log('boot');

const dbh = openDb(path.join(env.DATA_DIR, 'octotally.db'));
seedViews(dbh.db);

const tokens = new EnvToken(env.GITHUB_TOKEN);
const syncer = new Syncer({ db: dbh.db, tokens });
if (!env.GITHUB_TOKEN) syncer.noteNoToken('GITHUB_TOKEN not set: add a GitHub token to start syncing');
const poller = new Poller(dbh.db, syncer);
const sessionSecret = loadSessionSecret(env.SESSION_SECRET, env.DATA_DIR);

const app = createApp({ env, dbh, syncer, poller, tokens, sessionSecret });

const server = Bun.serve({ port: env.PORT, hostname: '0.0.0.0', fetch: app.fetch });
boot.info(
  {
    version: VERSION,
    port: env.PORT,
    dataDir: env.DATA_DIR,
    webDist: env.webDist,
    github: tokens.describe(),
    apiToken: Boolean(env.API_TOKEN),
    authPassword: Boolean(env.AUTH_PASSWORD),
  },
  'octotally listening',
);
poller.start(env.GITHUB_TOKEN ? 2_000 : 0);

process.on('unhandledRejection', (err) => boot.error({ err: errInfo(err) }, 'unhandled rejection'));
process.on('uncaughtException', (err) => boot.error({ err: errInfo(err) }, 'uncaught exception'));

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  boot.info({ signal }, 'shutting down');
  poller.stop();
  await server.stop(true);
  dbh.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
