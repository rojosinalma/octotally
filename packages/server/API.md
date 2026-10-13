# Octotally server API

Base URL: the server itself (default `http://localhost:3000`). Every `/api/*` and `/auth/*`
response is JSON with the envelope `{ ok: boolean, message: string, ...data }`; errors add
`kind`: `validation` (400), `auth` (401), `not_found` (404), `upstream` (502), `system` (500).
Action routes never redirect. Shapes below reference the zod schemas in `packages/shared`
(`Item`, `Activity`, `Settings`, `View`, `SyncStatus`, `Health`).

## Environment (bootstrap + secrets only)

| Variable         | Default                         | Meaning |
|------------------|---------------------------------|---------|
| `PORT`           | `3000`                          | Listen port (all interfaces). |
| `DATA_DIR`       | `./data`                        | SQLite file `octotally.db` and `session.secret` live here. |
| `GITHUB_TOKEN`   | –                               | PAT (read: issues, PRs, discussions, metadata). Without it the app boots, serves everything and reports an onboarding error in `/api/status`. |
| `AUTH_PASSWORD`  | –                               | When set, `/api/*` needs a session cookie from `POST /auth/login`. |
| `API_TOKEN`      | –                               | Machine credential: `/api/*` accepts `Authorization: Bearer <token>` (constant-time compare) in addition to the UI gate. |
| `SESSION_SECRET` | generated, persisted in `DATA_DIR/session.secret` (0600) | HMAC key for the session cookie. |
| `LOG_LEVEL`      | `info`                          | pino level: `trace` … `fatal`, `silent`. |
| `WEB_DIST`       | `packages/web/dist`             | Built SPA; served statically with `index.html` fallback when present. |

Bun loads `.env` from the cwd automatically; `bun --env-file=path src/index.ts` also works.
Tokens are never logged.

## Authentication

| Situation | `/api/*` access |
|---|---|
| `AUTH_PASSWORD` not set | open — put the instance behind your proxy's auth |
| `AUTH_PASSWORD` set | valid `octotally_session` cookie (HttpOnly, SameSite=Lax, 30 days, `Secure` when the request is https or `X-Forwarded-Proto: https`) |
| `API_TOKEN` set (either case) | `Authorization: Bearer <API_TOKEN>` is always accepted as an alternative; it never locks the browser out |

Anything else → `401 {ok:false, kind:"auth", message:"authentication required"}`. `/health` and
`/auth/*` are never gated. The SPA bundle is served regardless (it carries no data); the SPA
calls `GET /auth/status` and shows a login form when `required && !authenticated`.

### `GET /auth/status` → `{ok, message, authenticated: boolean, required: boolean}`
### `POST /auth/login` body `{password}` → `{ok, message, authenticated, required}` + `Set-Cookie`; 401 on a wrong password, 400 when the body lacks `password`.
### `POST /auth/logout` → clears the cookie.

## Health

### `GET /health` → `Health`
`{ok, db: "ok"|"error", version, lastSyncAt, githubRateRemaining}`; HTTP 503 when the database
does not answer. Not gated, no envelope `message`.

## Items

### `GET /api/items?q=<search>` → `{ok, message, items: Item[], total, query}`
`q` uses the shared grammar (`packages/shared/src/search.ts`): `is:open|closed|merged|draft|answered|unanswered`,
`is:issue|pr|discussion`, `repo:`, `org:`, `author:`/`assignee:` (`@me` = the synced login),
`role:author|assigned|mentioned|commenter|reviewer`, `label:`, `no:label|assignee|linked`,
`linked:pr`, `updated:`/`created:`/`activity:` (`>14d`, `>=2026-01-01`, `a..b`), `comments:>5`,
`hidden:none|muted|done|any` (default `none`), `sort:…`, bare words = title match. `-` negates.
`{settingKey}` placeholders are substituted from the current settings before parsing
(`updated:>{activeWindowDays}d`). Filtering runs server-side over all stored items; `total` is
the count after filtering. Empty `q` = `hidden:none`.

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
Only the keys present are changed. Validation → 400 with every issue in `message`
(`pollIntervalMin: Too small…; theme: Invalid option…`). `timezone` must be a valid IANA zone.

| Key | Default | Meaning |
|---|---|---|
| `activeWindowDays` | 30 | "Active" = last activity within this many days (`{activeWindowDays}` in views). |
| `pollIntervalMin` | 15 | Poll interval; ±10 % jitter. |
| `backoffMaxMin` | 120 | Cap of the exponential backoff after GitHub failures. |
| `activityKeep` | 20 | Activity rows kept per item. |
| `digestDaily` | false | Send the daily digest. |
| `digestHour` | 9 | Local hour (0–23) of the daily digest. |
| `digestRealtime` | false | Send a message right after a sync that found new activity. |
| `timezone` | `UTC` | IANA zone for `digestHour`. |
| `discordWebhookUrl` | `""` | https Discord webhook; empty = notifier off. |
| `theme` | `auto` | UI theme (`Theme` enum). |
| `defaultView` | `active` | View id shown on load. |

## Repos, notifiers, misc

### `GET /api/repos` → `{ok, message, repos: [{repo, count}]}` — visible (`hidden:none`) items per repo, most first.
### `GET /api/notifiers` → `{ok, message, notifiers: [{name, label, configured}]}`
### `POST /api/notifiers/:name/test` → `{ok, message, notifier}`; 400 when not configured, 404 unknown, 502 when the webhook fails.
### `POST /api/digest/send` → `{ok, message, sent: string[], skipped?}` — builds and sends the daily digest now (dedupes identical payloads for 48 h).
### `GET /api/version` → `{ok, message, version}`
Unknown `/api/*` path → `404 {ok:false, kind:"not_found"}`.

## Digest messages

`DigestMessage {kind: daily|realtime|test, title, lines[], footer?}`. Lines are Markdown:
`**[repo#n (type) — title](url)**` followed by `  · YYYY-MM-DD HH:MM <summary> ([link](url))`.
Daily: everything noticed (by `seenAt`) since the last daily digest, excluding `done` items, with
`N active · M need a PR` as footer; sent once per local day at/after `digestHour`. Realtime: the
activity of the sync that just finished. Items first seen on a later sync appear as
`New issue: <title>`. Discord chunks at 4000 chars per embed, 10 embeds per request.

## Adding a notifier

`src/lib/notifiers/<name>.ts` exporting a `Notifier {name, label, configured(settings), send(message, settings)}`
and one entry in `src/lib/notifiers/index.ts`. Configuration comes from settings only (add keys
to the shared `Settings` schema).
