# Octotally

**Every GitHub issue, pull request and discussion you are part of, on one page, filtered to what
still needs you.**

Octotally polls GitHub for everything that `involves:` you, keeps it in a small SQLite database and
shows it as a single GitHub-style list: active threads (replies in the last N days), open items that
still have no linked PR, your own backlog. Mark items done or mute them until something new happens,
search with GitHub qualifiers plus relative dates, and get a Discord digest of what moved. Single
user, read-only against GitHub, one container.

## Why

- GitHub's own pages split issues, pull requests and discussions into three dashboards, and
  discussions have no "involves me" page at all.
- Their date filters are absolute (`updated:>2026-01-01`), so a saved "last two weeks" link goes
  stale the day after you bookmark it.
- The notifications inbox is a stream, not a backlog: once you clear it, the open issue nobody
  answered is gone from view.

Octotally is the missing fourth view: one list, relative dates, a backlog that stays until you
decide it is done.

## Features

- Issues, pull requests **and** discussions from every repository your token can see
- Built-in views: **Active** (activity in the last N days), **Needs PR** (open, nothing linked),
  **All**, **Hidden**; custom views are saved searches
- GitHub-compatible search syntax with relative dates (`updated:>14d`), roles (`role:mentioned`),
  linked PRs (`-linked:pr`) and local state (`hidden:muted`)
- **Done** and **Mute** per item; a muted item comes back by itself when new activity arrives
- Item panel with the latest activity, labels, assignees and linked PRs
- Discord digest: daily at a chosen hour and/or near-real-time pings
- Keyboard first: `j`/`k` move, `e` done, `m` mute, `o` open on GitHub, `/` search, `?` help
- All nine GitHub Primer themes, following the OS by default
- JSON API for scripts and agents, `/health` for monitors
- Rate-limit aware poller with backoff; cached data is served while GitHub is down

## Screenshots

| Dashboard (dark dimmed) | Dashboard (light) | Settings |
|---|---|---|
| ![Dashboard, dark dimmed theme](docs/screenshots/dashboard-dark-dimmed.png) | ![Dashboard, light theme](docs/screenshots/dashboard-light.png) | ![Settings](docs/screenshots/settings.png) |

## Quick start (Docker)

```sh
mkdir octotally && cd octotally
curl -fsSLO https://raw.githubusercontent.com/rojosinalma/octotally/main/docker-compose.example.yml
curl -fsSL https://raw.githubusercontent.com/rojosinalma/octotally/main/.env.example -o .env
mv docker-compose.example.yml docker-compose.yml
# edit .env: paste GITHUB_TOKEN, set AUTH_PASSWORD + SESSION_SECRET unless a proxy does auth
docker compose up -d
```

Open http://localhost:3000. The first poll runs at start; items appear within a minute.

The image is `ghcr.io/rojosinalma/octotally` (`latest`, `vX.Y`, `vX.Y.Z`; `linux/amd64` and
`linux/arm64`). It runs as a non-root user and stores everything under `/data`.

### GitHub token

Octotally never writes to GitHub, so a read-only token is enough.

- **Fine-grained token** (GitHub → Settings → Developer settings → Fine-grained tokens): repository
  access *All repositories* or a selection; repository permissions, read-only: **Issues**,
  **Pull requests**, **Discussions**, **Metadata**. A fine-grained token only sees the owner and
  organisations it was granted, so for involvement across many organisations a classic token is
  simpler.
- **Classic token**: scopes `repo` (or `public_repo`) and `read:discussion`.

## Configuration

### Environment (bootstrap and secrets)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GITHUB_TOKEN` | yes | – | Personal access token (see above). Without it the UI shows an onboarding card and `/health` is degraded |
| `AUTH_PASSWORD` | no | – | Single password for the UI. Leave empty when a reverse proxy authenticates |
| `SESSION_SECRET` | with `AUTH_PASSWORD` | – | Signs the login cookie (`openssl rand -hex 32`) |
| `API_TOKEN` | no | – | Bearer token scripts can use on `/api/*`; always accepted, never required for the browser |
| `LOG_LEVEL` | no | `info` | `trace` `debug` `info` `warn` `error` `fatal` `silent` |
| `PORT` | no | `3000` | Listen port (set in the image) |
| `DATA_DIR` | no | `/data` in the image, `./data` locally | SQLite database location |
| `WEB_DIST` | no | built-in | Directory of the built SPA (set in the image) |

### Settings (in the app)

Everything tunable is edited on the Settings page (or via `PUT /api/settings`) and takes effect
without a restart.

| Setting | Default | Meaning |
|---|---|---|
| `activeWindowDays` | 30 | An item is *active* when its last activity is within this many days |
| `pollIntervalMin` | 15 | Minutes between GitHub polls (plus jitter) |
| `backoffMaxMin` | 120 | Cap of the exponential backoff after GitHub errors or rate limiting |
| `activityKeep` | 20 | Activity rows kept per item |
| `digestDaily` | false | Send a daily digest |
| `digestHour` | 9 | Local hour (0–23) of the daily digest |
| `timezone` | `UTC` | IANA timezone for `digestHour` |
| `digestRealtime` | false | Send a ping right after a poll that found new activity |
| `discordWebhookUrl` | – | Discord webhook (`https://` only) |
| `theme` | `auto` | One of the nine Primer themes, or `auto` to follow the OS |
| `defaultView` | `active` | View shown on load |

## Search syntax

A GitHub-compatible subset. Terms are ANDed; prefix a qualifier with `-` to negate it. The same
grammar runs in the browser (instant filtering) and on the server (`GET /api/items?q=`).

| Qualifier | Values | Notes |
|---|---|---|
| `is:` | `open` `closed` `merged` `draft` `answered` `unanswered` `issue` `pr` `discussion` | `merged`/`draft` apply to PRs, `answered` to discussions |
| `type:` | `issue` `pr` `discussion` | plurals accepted |
| `state:` | `open` `closed` `merged` | |
| `repo:` | `owner/name` | |
| `org:` / `user:` | `owner` | |
| `author:` `assignee:` | `login` or `@me` | |
| `mentions:` `commenter:` `reviewer:` | `@me` | shortcuts for `role:` |
| `role:` | `author` `assigned` `mentioned` `commenter` `reviewer` | how you are involved |
| `label:` | `name` | repeat for several; `"quoted name"` for spaces |
| `no:` | `label` `assignee` `linked` | |
| `linked:` | `pr` | issues with a linked/closing PR; `-linked:pr` for the backlog |
| `updated:` `activity:` | `>14d` `>=2w` `<1mo` `>1y` `2026-01-01..2026-02-01` | both compare the last known activity; units `d` `w` `mo` `y`, ops `> >= < <= =` and `..` ranges |
| `created:` | same as above | creation date |
| `comments:` | `>5` `<=0` | comment count |
| `hidden:` | `none` `muted` `done` `hidden` `any` | local state; defaults to `none` when absent |
| `sort:` | `updated-desc` `updated-asc` `created-desc` `created-asc` `comments-desc` | default `updated-desc` |
| bare words, `"quoted text"` | | case-insensitive match on title, repo and `#number` |

Examples:

```
is:open type:pr repo:acme/widgets updated:>14d
is:issue -linked:pr role:author label:bug
hidden:muted sort:created-asc
"rate limit" org:acme
```

## Views

Built-in views are saved searches, stored like any other view:

| View | Query |
|---|---|
| Active | `updated:>{activeWindowDays}d hidden:none` |
| Needs PR | `is:open -is:pr -linked:pr hidden:none` |
| All | `hidden:none` |
| Hidden | `hidden:hidden` |

`{setting}` placeholders are substituted from Settings before parsing, so changing
`activeWindowDays` changes the Active view. Custom views are created from the search bar ("Save as
view") or via `POST /api/views`.

## Digest

Set `discordWebhookUrl` in Settings and enable either or both:

- **Daily** at `digestHour` in `timezone`: items that became active or changed state since the
  previous digest, grouped by repository, with a link to each.
- **Realtime**: a short ping after each poll that found new activity on non-hidden items.

Digests are keyed by the last-sent timestamp, so a restart never re-sends. A failing webhook is
logged and retried on the next cycle; it never blocks the poll. "Send test" on the Settings page
posts a sample message. Other notifiers are one file each — see
[CONTRIBUTING.md](CONTRIBUTING.md#adding-a-notifier).

## Authentication

Octotally is single-user. Pick one:

1. **None** — only on a trusted network. The UI shows everything the token can see.
2. **`AUTH_PASSWORD`** — a login form and a signed session cookie (`SESSION_SECRET` required).
3. **Reverse proxy** — Cloudflare Access, Authelia, Authentik, oauth2-proxy… in front of the
   container; leave `AUTH_PASSWORD` empty.
4. **`API_TOKEN`** — for scripts: `Authorization: Bearer <token>` on `/api/*`. An extra credential
   next to the UI gate; it never blocks the browser (the gate is `AUTH_PASSWORD` or your proxy).

GitHub OAuth login (no PAT) is on the roadmap; the token source is a single interface so it can be
added without touching the rest.

## API

All action routes answer `{ "ok": true|false, "message": "...", ...data }`; errors add
`"kind": "validation" | "auth" | "not_found" | "upstream" | "system"`. Send
`Authorization: Bearer $API_TOKEN` when the token is set.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/items?q=<search>` | Items matching a search (`items`, `total`, `query`) |
| `GET` | `/api/items/:id` | One item with its activity |
| `POST` | `/api/items/:id/mute` | Hide until new activity |
| `POST` | `/api/items/:id/done` | Hide permanently (until restored) |
| `POST` | `/api/items/:id/restore` | Unhide |
| `POST` | `/api/refresh` | Poll GitHub now |
| `GET` | `/api/status` | Last sync, next sync, rate limit, item count |
| `GET` | `/api/views` | Built-in and custom views |
| `POST` `PUT` `DELETE` | `/api/views`, `/api/views/:id` | Manage custom views |
| `GET` `PUT` | `/api/settings` | Read / patch settings |
| `GET` | `/api/repos` | Repositories with item counts (sidebar facets) |
| `POST` | `/api/notifiers/:name/test` | Send a test message |
| `GET` | `/health` | `{ok, db, version, lastSyncAt, githubRateRemaining}`; 503 when the database is unreachable |

```sh
curl -s -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:3000/api/items?q=is:open%20-linked:pr" | jq '.items[] | .repo + "#" + (.number|tostring) + " " + .title'
```

Changes to these routes are additive; a breaking change bumps the major version.

## Themes

All nine Primer themes: light, light colorblind, light tritanopia, light high contrast, dark, dark
dimmed, dark colorblind, dark tritanopia, dark high contrast — plus `auto`, which follows the OS.
Pick one in Settings.

## Health

`GET /health` returns `200` with database state, last sync time and the remaining GitHub rate limit,
or `503` when the database is unreachable. The image has a `HEALTHCHECK` on it; point your uptime
monitor at the same URL.

## Development

```sh
bun install
bun run dev      # server :3000 + Vite :5173
bun run verify   # typecheck, lint, tests, build, container smoke
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and extension points and
[docs/architecture.md](docs/architecture.md) for how the pieces fit.

## Roadmap

- GitHub OAuth login instead of a PAT
- MCP endpoint ("what is pending on GitHub?") for agents
- Write actions: comment, close, mark discussion answered
- More notifiers: ntfy, Apprise, generic webhook
- Prometheus `/metrics` if someone needs it

## License

[AGPL-3.0](LICENSE). Run it, change it, share it — and if you serve a modified version to others
over a network, offer them the source.
