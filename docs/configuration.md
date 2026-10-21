# Configuration

Two layers: the environment holds bootstrap values and secrets, the Settings page (or
`PUT /api/settings`) holds every tunable. Settings take effect without a restart.

## Environment (bootstrap and secrets)

Copy [`.env.example`](../.env.example) to `.env`. Bun loads `.env` from the working directory
automatically; `bun --env-file=path packages/server/src/index.ts` also works. Tokens are never
logged or returned by the API. The only one ever stored is a GitHub token handed over by
Octoforge, and that one is encrypted ([octoforge.md](octoforge.md#which-token-wins-and-how-it-is-stored)).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GITHUB_TOKEN` | yes | – | Personal access token (scopes in the [README](../README.md#requirements)). Without it the app boots, the UI shows an onboarding card and `/api/status` reports `GITHUB_TOKEN not set` |
| `AUTH_PASSWORD` | no | – | Password for the UI (login form + signed session cookie). Leave empty when a reverse proxy authenticates users |
| `SESSION_SECRET` | no | generated | HMAC key for the session cookie. When unset, a random secret is generated once and persisted at `DATA_DIR/session.secret` (mode 0600); set it explicitly (`openssl rand -hex 32`) when the data directory is not persistent |
| `API_TOKEN` | no | – | Bearer token for `/api/*` clients (scripts, agents). Always accepted next to the UI gate, never required for the browser |
| `OCTOFORGE_TOKEN` | no | – | Shared bearer for the [Octoforge](octoforge.md) routes under `/api/octoforge`. Unset = those routes do not exist (404) |
| `DATABASE_URL` | no | SQLite at `DATA_DIR/octotally.db` | `sqlite:<path>` or `postgres://user:password@host:5432/db` (also `postgresql://`); see [Database](#database) |
| `DATABASE_SCHEMA` | no | `octotally` | Postgres schema the tables live in; ignored for SQLite |
| `LOG_LEVEL` | no | `info` | `trace` `debug` `info` `warn` `error` `fatal` `silent`; JSON lines on stdout |
| `PORT` | no | `3000` | Listen port, all interfaces (set in the image) |
| `DATA_DIR` | no | `/data` in the image, `./data` locally | Holds `octotally.db` (SQLite, WAL), `session.secret` and, after an Octoforge database move, `octoforge-database.json` |
| `WEB_DIST` | no | `packages/web/dist` | Directory of the built SPA (set in the image) |

The compose file reads two more variables from `.env` that the app itself ignores:
`OCTOTALLY_BIND` (host address the UI is published on, default `0.0.0.0`) and `OCTOTALLY_PORT`
(host port, default `3000`). The server inside the container always listens on 3000.

## Database

SQLite is the default and needs no setup: the file is `DATA_DIR/octotally.db`. Keep it on local
disk, not on a network share.

Octotally also runs on Postgres. Point `DATABASE_URL` at it and, if you want, pick the schema
with `DATABASE_SCHEMA` (default `octotally`). The schema is created when it is missing and the
migrations run there on every start, same as with SQLite. One role that owns the schema is all
it needs.

```sh
DATABASE_URL=postgres://octotally:secret@db.example:5432/tools
DATABASE_SCHEMA=octotally
```

When Octoforge has moved the database (`POST /api/octoforge/database/adopt`),
`DATA_DIR/octoforge-database.json` overrides both variables at start-up. Delete it with
`DELETE /api/octoforge/database` and restart to go back; see [octoforge.md](octoforge.md#moving-the-database).

## Settings (in the app)

Stored as key → JSON value in the `settings` table, validated by the shared `Settings` schema
(`packages/shared/src/types.ts`), merged over the defaults at read time.

| Setting | Default | Meaning |
|---|---|---|
| `activeWindowDays` | 30 | An item is *active* when its last activity is within this many days; `{activeWindowDays}` is available as a placeholder in view queries |
| `pollIntervalMin` | 15 | Minutes between GitHub polls (±10 % jitter) |
| `backoffMaxMin` | 120 | Cap of the exponential backoff after GitHub errors or rate limiting |
| `activityKeep` | 20 | Activity rows kept per item |
| `digestDaily` | false | Send a daily digest |
| `digestHour` | 9 | Local hour (0–23) of the daily digest |
| `timezone` | `UTC` | IANA timezone for `digestHour` |
| `digestRealtime` | false | Send a ping right after a poll that found new activity |
| `discordWebhookUrl` | – | Discord webhook (`https://` only); empty = notifier off |
| `theme` | `auto` | One of the nine Primer themes, `dark_dracula`, or `auto` to follow the OS |
| `defaultView` | `active` | View shown on load |

`PUT /api/settings` takes a partial object and changes only the keys present; validation errors
come back as `400` with every issue in `message` (`pollIntervalMin: Too small…; theme: Invalid
option…`). `timezone` must be a valid IANA zone.
