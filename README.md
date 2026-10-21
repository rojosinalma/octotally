# Octotally

[![run-tests](https://github.com/rojosinalma/octotally/actions/workflows/run-tests.yml/badge.svg)](https://github.com/rojosinalma/octotally/actions/workflows/run-tests.yml)
[![release](https://github.com/rojosinalma/octotally/actions/workflows/release.yml/badge.svg)](https://github.com/rojosinalma/octotally/actions/workflows/release.yml)
[![latest release](https://img.shields.io/github/v/release/rojosinalma/octotally)](https://github.com/rojosinalma/octotally/releases/latest)
[![licence](https://img.shields.io/github/license/rojosinalma/octotally)](LICENSE)

| Dashboard (dark dimmed) | Dashboard (light) | Settings |
|---|---|---|
| ![Dashboard, dark dimmed theme](docs/screenshots/dashboard-dark-dimmed.png) | ![Dashboard, light theme](docs/screenshots/dashboard-light.png) | ![Settings, dark dimmed theme](docs/screenshots/settings-dark-dimmed.png) |

**Every GitHub issue, pull request and discussion you are part of, on one page, filtered to what
still needs you.**

Octotally polls GitHub for everything that `involves:` you, keeps it in a small SQLite database and
shows it as a single GitHub-style list: active threads (replies in the last N days), open items that
still have no linked PR, your own backlog. Mark items done or mute them until something new happens,
search with GitHub qualifiers plus relative dates, and get a Discord digest of what moved. It reads
from GitHub with a read-only token and ships as one container.

Octotally runs on its own with SQLite, or on Postgres if you prefer. It can also be a member of
[Octoforge](https://github.com/rojosinalma/octoforge), which hands it a GitHub token and can host
its database; that part is opt-in, see [`docs/octoforge.md`](docs/octoforge.md).

Features, configuration, search syntax, API and operations are documented in [`docs/`](docs/);
the design is in [`docs/SDD.md`](docs/SDD.md).

## Requirements

- Docker ≥ 24 with Compose v2 (the image is published for `linux/amd64` and `linux/arm64`), or
  [Bun](https://bun.sh) ≥ 1.4 to run from source.
- A GitHub personal access token. Octotally never writes to GitHub, so read-only is enough:
  - **Fine-grained token** (GitHub → Settings → Developer settings → Fine-grained tokens):
    repository access *All repositories* or a selection; repository permissions, read-only:
    **Issues**, **Pull requests**, **Discussions**, **Metadata**. A fine-grained token only sees
    the owner and organisations it was granted, so for involvement across many organisations a
    classic token is simpler.
  - **Classic token**: scopes `repo` (or `public_repo`) and `read:discussion`.
- Optional: a Discord webhook for the digest, a reverse proxy that authenticates users if you do
  not want to use the built-in password.

## Installation

```sh
mkdir octotally && cd octotally
curl -fsSLO https://raw.githubusercontent.com/rojosinalma/octotally/main/compose.yaml
curl -fsSL https://raw.githubusercontent.com/rojosinalma/octotally/main/.env.example -o .env
# edit .env: paste GITHUB_TOKEN, set AUTH_PASSWORD unless a reverse proxy does auth
docker compose up -d
```

The image is `ghcr.io/rojosinalma/octotally` (`latest`, `vX.Y`, `vX.Y.Z`); it runs as a non-root
user and stores everything under `/data`. Everything else — poll interval, active window, digest,
theme — is set on the Settings page; see [`docs/configuration.md`](docs/configuration.md).

## Usage

Open http://localhost:3000 and log in with `AUTH_PASSWORD`. The first poll runs at start; items
appear within a minute. Pick a view (All, Active, Needs PR, Hidden), or type a query with GitHub
qualifiers plus relative dates:

```
is:open type:pr updated:>7d -author:@me
```

Mark an item done, or mute it until something new happens. Scripts use the same data through the
API:

```sh
curl -s -H "Authorization: Bearer $API_TOKEN" 'http://localhost:3000/api/items?q=is:open+type:issue' | jq '.items | length'
```

Search syntax: [`docs/search.md`](docs/search.md). API: [`docs/api.md`](docs/api.md).
Health, logs and upgrades: [`docs/operations.md`](docs/operations.md).

## Development

```sh
bun install
bun run dev          # server on :3000 + Vite on :5173
bun test             # unit tests
bun run verify       # typecheck, lint, tests, build, docker build + /health smoke
```

Layout, conventions, extension points and the release flow are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AGPL-3.0](LICENSE). Run it, change it, share it — and if you serve a modified version to others
over a network, offer them the source.
