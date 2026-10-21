# Software design document

## Purpose

GitHub splits the things I am involved in across three dashboards (issues, pull requests,
discussions — the last with no "involves me" page at all), filters by absolute dates, and treats
notifications as a stream that is gone once cleared. Octotally is the missing fourth view: one
list of every issue, PR and discussion that `involves:` the token's account, filtered with a
GitHub-compatible grammar plus relative dates, with a local backlog state (done, muted) that
stays until I decide otherwise, and a Discord digest of what moved.

Design goals, in order: correctness of the involvement set, zero writes to GitHub, one process
and one file to run, one definition of every shape shared by server and UI.

## Architecture

One Bun process, one database (a SQLite file by default, or a Postgres schema), three workspace
packages. Optionally it is a member of [Octoforge](octoforge.md), which can hand it a GitHub token
and host its database.

| Package | Role |
|---|---|
| `packages/shared` | The contract. Zod schemas for `Item`, `Activity`, `Settings`, `View`, API envelopes and routes (`src/types.ts`); the search grammar, matcher and sorter (`src/search.ts`); the Octoforge manifest schema (`src/octoforge.ts`). Imported by server and web, so there is one definition of every shape and one parser. |
| `packages/server` | Bun + [Hono](https://hono.dev). `src/routes` validates input and delegates to `src/lib`; `src/db` holds the Drizzle schema for `bun:sqlite` and Postgres (`postgres`), migrations under `src/db/migrations/{sqlite,postgres}`. Serves the built SPA from `WEB_DIST`. |
| `packages/web` | Vite + React + [Primer React](https://primer.style). Talks to `/api/*`, filters client-side with the shared grammar for instant feedback, and lets the server run the authoritative query. |

```
GitHub GraphQL ──search(involves:@me, ISSUE_ADVANCED)──┐
                ──search(involves:@me, DISCUSSION)──────┤
                                                        ▼
                      poller (lib/poller.ts) ── zod-validate ── upsert items/activity ──► SQLite
                           │  interval = settings.pollIntervalMin (+ jitter)                │
                           │  backoff on errors/rate limit, cap = settings.backoffMaxMin     │
                           ▼                                                                 ▼
                      digest (lib/digest.ts) ── diff since last digest ── notifiers ──► Discord
                                                                                             │
                 Hono routes (/api/*, /health) ── applySearch(items, q, settings) ◄───────────┘
                           ▲
                           │ fetch, bearer / session cookie
                      React SPA (Primer) ── same grammar for live filtering
```

### Server components (`packages/server/src`)

| File | Responsibility |
|---|---|
| `index.ts` | Boot: load env, open the database, seed built-in views, build `Syncer` + `Poller`, load the session secret, start `Bun.serve` on `0.0.0.0:PORT`, start the poller (2 s after boot when a token exists), handle `SIGINT`/`SIGTERM`. |
| `env.ts` | Zod schema of the environment: bootstrap values and secrets only, empty strings count as unset. |
| `app.ts` | Hono app: request log middleware, error handler (`kind: system`), `/health`, `/auth`, `/api/octoforge` (own bearer, mounted before the gate), the `/api/*` gate (`apiAllowed`), `/api` routes, static SPA with `index.html` fallback and immutable caching for `/assets/`. |
| `routes/api.ts`, `routes/auth.ts`, `routes/health.ts`, `routes/octoforge.ts`, `routes/respond.ts` | Routes validate (zod), call `lib/`, answer with `jsonOk` / `jsonErr`. |
| `lib/github/{client,queries,fetch,map,schema}.ts` | Minimal GraphQL client (one method, typed errors `auth|rate_limit|upstream|schema`, retries on 502/503/504 and secondary rate limits, rate-limit bookkeeping on every call); the query documents; paging; zod validation of responses; mapping to `Item`/`Activity`. |
| `lib/sync.ts` | `Syncer`: one sync at a time (mutex), viewer login → involvement searches → role searches → one transaction of upserts; backoff state; `status()` for `/api/status` and `/health`. |
| `lib/poller.ts` | `setTimeout` loop: sync → realtime digest → daily digest if due → schedule the next run from the settings read this cycle (±10 % jitter, syncer backoff). Nothing in it throws. |
| `lib/digest.ts`, `lib/notifiers/` | Builds daily/realtime messages from activity noticed since the last digest; dispatches to configured notifiers; records sends with a payload hash. |
| `lib/items.ts`, `lib/settings.ts`, `lib/relevance.ts` | Item queries and mute/done/restore; settings merge/patch and view seeding; the pure relevance rules. |
| `lib/github/user.ts` | REST `GET /user`: who a token acts as, used to check a token Octoforge hands over. |
| `lib/auth.ts`, `lib/token.ts` | HMAC session cookie, constant-time compare, session-secret persistence; the `TokenSource` seam (`LayeredToken`: delivered token over `GITHUB_TOKEN`; `EnvToken`). |
| `lib/octoforge/{manifest,credentials,database}.ts` | Member contract v1: the bundled `octoforge.json`, the encrypted store for a delivered GitHub token, database status, adoption and rollback. |
| `log.ts` | pino root logger with child loggers per subsystem (`http github poll digest notify db boot auth octoforge`). |

### Web (`packages/web/src`)

`App.tsx` → `pages/Dashboard.tsx` (sidebar with views and repo facets, search bar with
autocomplete, item list, item panel) and `pages/Settings.tsx`; `pages/Login.tsx` when
`/auth/status` says `required && !authenticated`. `hooks/useApp.tsx` holds the client state and
talks to `api.ts`; `lib/search.ts` re-runs the shared grammar on the loaded items while typing;
`hooks/useKeyboard.ts` implements the shortcuts; `theme.tsx` wires the Primer themes plus
`themes/dark_dracula.css`.

## Data model and storage

SQLite via `bun:sqlite` (WAL, foreign keys, 5 s busy timeout) at `DATA_DIR/octotally.db` by
default, or Postgres in the schema `DATABASE_SCHEMA` (default `octotally`) when `DATABASE_URL`
points at one. Schema in `packages/server/src/db/` (`schema.ts` and its Postgres mirror
`schema.pg.ts`; a type check fails the build when they drift); Drizzle migrations in
`packages/server/src/db/migrations/{sqlite,postgres}`, applied on every boot, additive only. Every
Postgres query names its schema, so nothing depends on `search_path`.

| Table | Content |
|---|---|
| `items` | One row per GitHub issue / PR / discussion ever seen, keyed by the GraphQL node id: type, number, title, url, repo/owner, state, draft flag, author, labels/assignees/roles (JSON), comment count, linked PRs (JSON), answered flag, `createdAt`/`updatedAt`/`lastActivityAt`(+`By`), the local state `hidden` (`none|muted|done`), `hiddenAt`, `mutedActivityAt`, `firstSeenAt`, `lastSyncedAt`. Indexed on `repo` and `lastActivityAt`. Rows are never deleted. |
| `activity` | The last `activityKeep` events per item (kind, actor, summary, url, `at`), plus `seenAt` = when the tracker noticed it. Digests are cut by `seenAt`, not `at`. Cascades on item delete. |
| `settings` | `key → JSON value`, validated by the shared `Settings` schema and merged over defaults at read time. One extra key outside that schema, `octoforge.github_token`, holds a token delivered by Octoforge, encrypted (AES-256-GCM). |
| `views` | Built-in and custom views: id, name, query, `builtin`, `position`. Built-ins are seeded, never overwritten. |
| `digests` | Send log: `sentAt`, `kind` (`daily|realtime|test`), notifier, `payloadHash`. |
| `sync_runs` | One row per sync: timestamps, ok/error, rate limit remaining/reset, login, counts. |

Outside the database: `DATA_DIR/session.secret` (0600) when `SESSION_SECRET` is not set, and
`DATA_DIR/octoforge-database.json` (0600) after an Octoforge database move; it overrides
`DATABASE_URL`/`DATABASE_SCHEMA` at start-up.

## Key flows

1. **Poll.** The poller calls `Syncer.run()`: `viewer` login, then `search(ISSUE_ADVANCED,
   "involves:<login>")` and `search(DISCUSSION, …)` paged at 50 (safety cap 40 pages), then one
   id-only search per role qualifier (`assignee`, `mentions`, `commenter`, `review-requested`,
   `reviewed-by`) to derive `roles`. Every call is logged with query name, cost and remaining
   budget; every response is zod-validated before anything is written. The snapshot is upserted in
   one transaction; `detectActivity` compares old and new rows to produce activity. A mute clears
   when newer activity arrives. A sync is skipped while the remaining rate budget is below the
   previous sync's measured cost; failures back off exponentially from `pollIntervalMin` to
   `backoffMaxMin`.
2. **Digest.** After a successful sync with new activity and `digestRealtime` on, a realtime
   message goes out. When `dailyDue` (once per local day in `timezone`, at or after `digestHour`),
   the daily digest covers everything noticed since the last daily send. Identical payloads are
   deduplicated by hash for 48 h; a notifier failure is logged and retried next cycle.
3. **Query.** `GET /api/items?q=` substitutes `{setting}` placeholders, parses `q` with the shared
   grammar and applies `matchesItem` + `sortItems` over the stored items. Parameterised SQL only.
4. **Show.** The SPA loads the view's items, re-filters locally while typing, and posts
   mute/done/restore optimistically; the server's answer replaces the row.
5. **Auth.** `/api/*` passes when a bearer equals `API_TOKEN`, or `AUTH_PASSWORD` is unset, or the
   `octotally_session` cookie verifies. `/health`, `/auth/*` and the static bundle are never gated.
   `/api/octoforge/*` has its own gate: it exists only with `OCTOFORGE_TOKEN` and needs that bearer
   (manifest excepted).
6. **Token delivery.** `PUT /api/octoforge/github` checks the token with GitHub `GET /user`
   (must be a user), encrypts it into the settings table and starts a sync. `LayeredToken` reads it
   on every sync and falls back to `GITHUB_TOKEN` when there is none or it cannot be decrypted.
7. **Database move.** `POST /api/octoforge/database/adopt` migrates the target, copies the rows,
   compares counts and writes `octoforge-database.json`; the next start uses the new database.
   `DELETE /api/octoforge/database` plus a restart rolls back. Details: [octoforge.md](octoforge.md).

### Relevance rules

Pure functions over an `Item` in `lib/relevance.ts`, each with a row in a table-driven test:

- **active** — `lastActivityAt` within `activeWindowDays`.
- **needs PR** — open issue with no linked PR; open discussion that is not answered.
- **muted** — hidden until `lastActivityAt > mutedActivityAt`; the poller clears the mute.
- **done** — hidden until restored.

The built-in views express these as search strings (`updated:>{activeWindowDays}d hidden:none`,
`is:open -is:pr -linked:pr hidden:none`), so the UI, the API and the digest share one definition.

## Configuration surface

- **Environment** (bootstrap and secrets, `env.ts`): `GITHUB_TOKEN`, `AUTH_PASSWORD`,
  `SESSION_SECRET`, `API_TOKEN`, `OCTOFORGE_TOKEN`, `DATABASE_URL`, `DATABASE_SCHEMA`, `LOG_LEVEL`,
  `PORT`, `DATA_DIR`, `WEB_DIST`. Nothing tunable lives here.
- **Settings table** (every tunable, editable at runtime from the Settings page or
  `PUT /api/settings`): `activeWindowDays`, `pollIntervalMin`, `backoffMaxMin`, `activityKeep`,
  `digestDaily`, `digestHour`, `timezone`, `digestRealtime`, `discordWebhookUrl`, `theme`,
  `defaultView`. Read at use time, never cached, so a change applies to the next cycle.
- **Views** are rows, not code; the built-in set is `BUILTIN_VIEWS` in `packages/shared/src/types.ts`.

Full tables: [configuration.md](configuration.md).

## Decisions and rationale

| Decision | Why |
|---|---|
| Shared `packages/shared` for schemas and the grammar | One parser and one shape definition; the browser can filter instantly with the exact semantics the server applies. |
| Zod at every boundary (env, API bodies, GitHub responses, settings) | GitHub's schema drifts and stored JSON must never be trusted blindly; validation errors are reported with every issue. |
| SQLite, WAL, one file by default | One account's involvement is small; a single file keeps backup and upgrade trivial and avoids a second service. |
| Postgres as a second engine (one schema per instance) | Octoforge hosts its members' data in one Postgres database, one schema each, so cross-tool views can read it. Same Drizzle schema and additive migrations for both engines; SQLite stays the default and needs nothing. |
| Rows are never deleted | The local state (done/muted) is the product; an item that drops out of `involves:` must not take its history with it. |
| Settings in the database, not env | Every tunable changes at runtime without a restart; env holds only what the process needs before it can read the database. |
| `setTimeout` loop, not `setInterval` or cron | No drift, backoff and jitter per cycle, and the next interval is read from the settings of this cycle. One poller, one digest scheduler, nothing else in the background. |
| Rate-limit aware syncing | Each sync measures its cost; the next is skipped when the remaining budget cannot cover it, so a busy account never hits the hard limit. |
| `involves:` searches plus id-only role searches | GitHub returns no per-item role; one cheap search per qualifier derives the roles for `role:` filtering. |
| `TokenSource` interface | The only seam auth changes touch: `EnvToken` now, an OAuth implementation later, nothing else knows where the token comes from. |
| Notifiers as a registry | Adding a transport is one file and one line; configuration comes from settings so the UI lists it automatically. |
| Primer React and the stock Primer themes | The UI should read like GitHub; extra themes reuse Primer's CSS-variable contract. |
| Non-root image, `/data` volume only | No capabilities, no sockets; `GITHUB_TOKEN` is read from the environment and never persisted. |
| Octoforge member contract v1, opt-in | One manifest and six routes let Octoforge list the app, hand it a token and move its data. Without `OCTOFORGE_TOKEN` none of it exists, so standalone use does not change. The routes have their own bearer so the UI gate and `API_TOKEN` stay as they are. |
| Delivered token encrypted in the settings table | A handed-over token must survive restarts and win over `GITHUB_TOKEN` without one. It sits under a key outside the `Settings` schema, so the settings API never sees it, and is encrypted (AES-256-GCM, key from HKDF over the session secret) because the database may move to a shared Postgres that a read-only role can read. A rotated secret means a fallback to `GITHUB_TOKEN`, not a crash. |

## Current scope and non-goals

What Octotally does today, stated as present behaviour:

- One GitHub account per instance: the one the token belongs to. `@me` and the role qualifiers
  refer to that account.
- Read-only against GitHub. Write actions (comment, close, mark answered) are on the
  [roadmap](roadmap.md) and nothing in the design precludes them.
- GitHub only; there is no provider abstraction.
- Not a notifications inbox: it tracks involvement and a backlog, not every event.
- No second scheduler or cron: the poller is the only background work.

## Operations

- **Logs:** JSON lines on stdout with a `subsystem` field; `LOG_LEVEL` sets verbosity. Every
  GitHub call is logged with cost and remaining budget; background errors carry a stack trace.
- **Health:** `GET /health` (`200`/`503`, never gated) backs the image `HEALTHCHECK` and external
  monitors; `GET /api/status` has the detailed sync state.
- **Upgrade:** pull the new image and recreate; migrations are additive and run on boot. The
  version is in `/health` and `/api/version`.
- **Data:** everything under `DATA_DIR`; back up the directory or use `sqlite3 .backup`. On
  Postgres, `pg_dump --schema=<DATABASE_SCHEMA>`.

Details: [operations.md](operations.md).
