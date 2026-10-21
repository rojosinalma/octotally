# API

Base URL: the server itself (default `http://localhost:3000`). Every `/api/*` and `/auth/*`
response is JSON with the envelope `{ ok: boolean, message: string, ...data }`; errors add
`kind`: `validation` (400), `auth` (401), `not_found` (404), `upstream` (502), `system` (500).
Action routes never redirect. Shapes below reference the zod schemas in `packages/shared`
(`Item`, `Activity`, `Settings`, `View`, `SyncStatus`, `Health`).

Send `Authorization: Bearer $API_TOKEN` when the token is set; see
[authentication.md](authentication.md) for the full decision table.

```sh
curl -s -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:3000/api/items?q=is:open%20-linked:pr" \
  | jq '.items[] | .repo + "#" + (.number|tostring) + " " + .title'
```

Changes to these routes are additive; a breaking change bumps the major version.

## Overview

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/items?q=<search>` | Items matching a search (`items`, `total`, `query`) |
| `GET` | `/api/items/:id` | One item with its activity |
| `POST` | `/api/items/:id/mute` | Hide until new activity |
| `POST` | `/api/items/:id/done` | Hide permanently (until restored) |
| `POST` | `/api/items/:id/restore` | Unhide |
| `POST` | `/api/refresh` | Poll GitHub now |
| `GET` | `/api/status` | Last sync, next sync, rate limit, item count |
| `GET` `POST` | `/api/views` | List views / create a custom view |
| `PUT` `DELETE` | `/api/views/:id` | Rename, reorder, change or delete a view |
| `GET` `PUT` | `/api/settings` | Read / patch settings |
| `GET` | `/api/repos` | Repositories with item counts (sidebar facets) |
| `GET` | `/api/notifiers` | Registered notifiers |
| `POST` | `/api/notifiers/:name/test` | Send a test message |
| `POST` | `/api/digest/send` | Send the daily digest now |
| `GET` | `/api/version` | `{ok, message, version}` |
| `GET` | `/health` | `{ok, db, version, lastSyncAt, githubRateRemaining}`; 503 when the database is unreachable |
| `GET` `POST` | `/auth/status`, `/auth/login`, `/auth/logout` | Session handling ([authentication.md](authentication.md#auth-routes)) |
| `GET` | `/api/octoforge/manifest` | The `octoforge.json` manifest (only with `OCTOFORGE_TOKEN` set) |
| `GET` | `/api/octoforge/status` | Contract, version, token and database origin ([octoforge.md](octoforge.md)) |
| `PUT` `DELETE` | `/api/octoforge/github` | Hand over / drop a GitHub token |
| `POST` | `/api/octoforge/database/adopt` | Move the data to another database (restart required) |
| `DELETE` | `/api/octoforge/database` | Undo the move (restart required) |

Unknown `/api/*` path → `404 {ok:false, kind:"not_found"}`.

The `/api/octoforge/*` routes have their own gate: they exist only when `OCTOFORGE_TOKEN` is set
(otherwise every one answers 404), and all but the manifest need
`Authorization: Bearer <OCTOFORGE_TOKEN>`. `API_TOKEN` and the session cookie do not apply there.

## Health

### `GET /health` → `Health`
`{ok, db: "ok"|"error", version, lastSyncAt, githubRateRemaining}`; HTTP 503 when the database
does not answer. Never gated, no envelope `message`.

## Items

### `GET /api/items?q=<search>` → `{ok, message, items: Item[], total, query}`
`q` uses the shared grammar documented in [search.md](search.md). `{settingKey}` placeholders are
substituted from the current settings before parsing (`updated:>{activeWindowDays}d`). Filtering
runs server-side over all stored items; `total` is the count after filtering. Empty `q` =
`hidden:none`.

### `GET /api/items/:id` → `{ok, message, item: Item, activity: Activity[]}`
Activity newest first, at most `settings.activityKeep` rows (capped at sync time).

### `POST /api/items/:id/mute` → `{ok, message, item}`
Sets `hidden:"muted"`, `hiddenAt`, and `mutedActivityAt = lastActivityAt`. The next sync that
sees newer activity flips it back to `none`.

### `POST /api/items/:id/done` → `{ok, message, item}` — `hidden:"done"`, sticky until restored.
### `POST /api/items/:id/restore` → `{ok, message, item}` — `hidden:"none"`.

`:id` is the GitHub GraphQL node id (`Item.id`). Unknown id → 404.

## Sync

### `POST /api/refresh` → `{ok, message, started: boolean}`
Returns immediately. `started:false` with message `sync already running` when a sync is in
flight (single mutex; nothing is queued).

### `GET /api/status` → `{ok, message, status: SyncStatus, tokenSource: string}`
`status`: `{lastSyncAt, lastSyncOk, lastError, nextSyncAt, syncing, githubLogin,
githubRateRemaining, githubRateResetAt, itemCount}`. Without a token: `githubLogin:null`,
`nextSyncAt:null`, `lastError:"GITHUB_TOKEN not set: add a GitHub token to start syncing"`.
`tokenSource` is a label such as `GITHUB_TOKEN (env)` (never the token).

Sync behaviour: `viewer` login → `search(ISSUE_ADVANCED, "involves:<login>")` + `search(DISCUSSION, …)`
(50/page, hard safety cap 40 pages, logged) → one id-only search per role qualifier
(`assignee`, `mentions`, `commenter`, `review-requested`, `reviewed-by`; `commenter` for
discussions; `author`/`assigned` derive from the node) → upsert. Rows are never deleted; items that
leave `involves:` keep their row and local state. Failures back off exponentially from
`pollIntervalMin` to `backoffMaxMin`; a sync is skipped while the remaining rate budget is below
the previous sync's measured cost.

## Views

### `GET /api/views` → `{ok, message, views: View[]}` ordered by `position`, then id.
### `POST /api/views` body `{name, query, id?, position?}` → `{ok, message, view}`
Custom view; `id` defaults to a slug of `name` and must match `^[a-z0-9-]+$`; duplicate id → 400.
### `PUT /api/views/:id` body `{name?, query?, position?}` → `{ok, message, view}`
Built-in views (`active`, `needs-pr`, `all`, `hidden`) accept only `name`/`position`; changing
their `query` → 400.
### `DELETE /api/views/:id` → `{ok, message, id}`; built-in → 400, unknown → 404.

## Settings

### `GET /api/settings` → `{ok, message, settings: Settings}` (stored values merged over defaults).
### `PUT /api/settings` body = partial `Settings` → `{ok, message, settings}`
Only the keys present are changed. Validation → 400 with every issue in `message`. The keys and
their defaults are listed in [configuration.md](configuration.md#settings-in-the-app).

## Repos, notifiers, misc

### `GET /api/repos` → `{ok, message, repos: [{repo, count}]}` — visible (`hidden:none`) items per repo, most first.
### `GET /api/notifiers` → `{ok, message, notifiers: [{name, label, configured}]}`
### `POST /api/notifiers/:name/test` → `{ok, message, notifier}`; 400 when not configured, 404 unknown, 502 when the webhook fails.
### `POST /api/digest/send` → `{ok, message, sent: string[], skipped?}` — builds and sends the daily digest now (dedupes identical payloads for 48 h).
### `GET /api/version` → `{ok, message, version}`

Digest message format and notifier extension: [notifications.md](notifications.md).

## Octoforge

Only with `OCTOFORGE_TOKEN` set; bearer `OCTOFORGE_TOKEN` on everything but the manifest.
Full description, token storage and the database move: [octoforge.md](octoforge.md).

### `GET /api/octoforge/manifest` → the `octoforge.json` document (no envelope, no bearer).
### `GET /api/octoforge/status` → `{ok, message, contract, version, github: {mode, source, login?}, database: {engine, schema?, source}}`
`mode` is `"pat"` or `null`; `source` is `env`, `octoforge` or `none`. Never returns a secret.
### `PUT /api/octoforge/github` body `{mode: "pat", token}` → `{ok, message, login, restart_required: false}`
Checked with GitHub `GET /user`: rejected token or a non-user account → 400 (GitHub's reason in
`message`), GitHub unreachable or `5xx` → 502. `mode: "app"` → 400. The stored token wins over
`GITHUB_TOKEN` from the next sync on, and one sync starts at once.
### `DELETE /api/octoforge/github` → `{ok, message, restart_required: false}` — back to `GITHUB_TOKEN`.
### `POST /api/octoforge/database/adopt` body `{url, schema = "octotally", copy = true}` → `{ok, message, tables, restart_required: true}`
`url` starts with `postgres://`, `postgresql://` or `sqlite:`; `schema` matches `^[a-z_][a-z0-9_]*$`.
Bad input → 400, database unreachable → 502, other failures → 500. The URL is never echoed.
### `DELETE /api/octoforge/database` → `{ok, message, removed, restart_required: true}`
