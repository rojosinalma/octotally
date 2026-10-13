# Architecture

One process, one SQLite file, three packages.

## Packages

| Package | Role |
|---|---|
| `packages/shared` | The contract. Zod schemas for `Item`, `Activity`, `Settings`, `View`, API envelopes and routes (`types.ts`); the search grammar, matcher and sorter (`search.ts`). Imported by both server and web, so there is one definition of every shape and one parser. |
| `packages/server` | Bun + Hono. Routes under `src/routes` validate and delegate to `src/lib`; `src/db` holds the Drizzle schema (`bun:sqlite`), migrations under `drizzle/`. Serves the built SPA from `WEB_DIST`. |
| `packages/web` | Vite + React + Primer React. Talks to `/api/*`, filters client-side with the shared grammar for instant feedback, and lets the server do the authoritative query. |

## Data flow

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

1. **Poll.** The poller runs `involves:@me` searches for issues/PRs and for discussions, then fetches
   details per item (state, labels, assignees, last activity, linked/closing PRs, answered flag).
   Every call is logged with query name, cost and remaining rate limit. Responses are validated
   with zod before anything is written.
2. **Store.** `items` holds the current snapshot, `activity` the last `activityKeep` events per item,
   `item_state` the local mute/done state, `settings` every tunable, `digests` the send log. Items
   that drop out of `involves:@me` keep their row and state; nothing is purged.
3. **Serve.** `GET /api/items?q=` substitutes `{setting}` placeholders, parses `q` with the shared
   grammar and applies `matchesItem` + `sortItems` over the stored items. Parameterised SQL only.
4. **Show.** The SPA renders the list, re-filters locally while typing, and posts mute/done/restore
   actions optimistically.

## Relevance rules

Pure functions over an `Item` in `lib/relevance.ts`, each with a row in a table-driven test:

- **active** — `lastActivityAt` within `activeWindowDays`.
- **needs PR** — open issue with no linked PR; open discussion that is not answered (no linked-PR
  concept exists for discussions).
- **muted** — hidden until `lastActivityAt > mutedActivityAt`; the poller clears the mute when
  newer activity arrives.
- **done** — hidden until restored.

The built-in views express these as search strings (`updated:>{activeWindowDays}d hidden:none`,
`is:open -is:pr -linked:pr hidden:none`), so the UI, the API and the digest share one definition.

## Digest

`lib/digest.ts` computes the set of non-hidden items whose activity or state changed since the
last successful digest (`digests` table), renders a message per notifier and records the send.
Two schedules, each a setting: daily at `digestHour` in `timezone`, and realtime after any poll
with changes. A notifier failure is logged with its stack trace and retried on the next cycle; it
never fails the poll or crashes the process.

## Extension points

| Seam | Where | How |
|---|---|---|
| Notifiers | `lib/notifiers/<name>.ts` + one line in `lib/notifiers/index.ts` | Implement `Notifier { name, configured(settings), send(digest, settings) }`. Discord webhook is the first entry. |
| Token source | `lib/token.ts` — `TokenSource` | `EnvToken` reads `GITHUB_TOKEN`; an OAuth implementation is the planned second one. Nothing else knows where the token comes from. |
| Views | `BUILTIN_VIEWS` in `packages/shared/src/types.ts` | A view is a row (id, name, query); adding one is data, not code. |
| Relevance rules | `lib/relevance.ts` | One pure function + one test row. |
| Search qualifiers | `packages/shared/src/search.ts` | Extend the doc comment, `QUALIFIERS`, the parser and `matchesItem`. |

## Stable contracts

Additive changes only; anything breaking bumps the major version.

- **API**: `GET /api/items?q=`, `GET /api/items/:id`, `POST /api/items/:id/{mute,done,restore}`,
  `POST /api/refresh`, `GET /api/status`, `GET /api/views`, `GET/PUT /api/settings`,
  `GET /api/repos`, `POST /api/notifiers/:name/test`, `GET /health`. Every action answers
  `{ok, message, …}`; errors carry `kind`.
- **Search syntax**: the GitHub-compatible subset documented in the README, one grammar in
  `packages/shared`.
- **Schema**: Drizzle migrations, additive only, applied on every boot; tables `items`, `activity`,
  `item_state`, `settings`, `digests`.
- **Image**: `DATA_DIR` volume (`/data`), `PORT` (3000), `GITHUB_TOKEN` required, `AUTH_PASSWORD`,
  `SESSION_SECRET`, `API_TOKEN` optional, `GET /health` for liveness. Non-root user, no
  capabilities, no sockets.

## Non-goals

Not a notifications inbox, one user per instance, read-only against GitHub (write actions are a
separate roadmap item and nothing here precludes them), no second scheduler or cron, no provider
abstraction (GitHub only).
