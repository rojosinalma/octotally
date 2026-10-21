# Contributing

Thanks for helping. Octotally keeps its dependencies minimal — one container, one language, a
handful of well-defined extension points — so most changes are a small, focused diff.

## Running it locally

- [Bun](https://bun.sh) ≥ 1.4 (CI and the image use 1.4)
- Docker (optional, for the container smoke test and the image)
- A GitHub token in `.env` (`cp .env.example .env`) if you want real data in the UI

```sh
bun install
bun run dev        # server on :3000 (bun --watch) + Vite dev server on :5173
```

Open http://localhost:5173 during development; Vite proxies `/api` and `/health` to the server.
`bun run build` produces `packages/web/dist`, which the server serves on :3000.

## Tests

```sh
bun test                   # everything
bun run verify             # = bin/verify: typecheck, lint, tests, build, docker build + /health smoke
SKIP_DOCKER=1 bin/verify   # without the container part (Postgres tests skipped)
```

`bin/verify` starts a throwaway Postgres container and runs the server suite on it as well. To do
that by hand, point `TEST_DATABASE_URL` at a Postgres you can create schemas in and set
`TEST_DB_ENGINE=postgres`. Without `TEST_DATABASE_URL` the Postgres-only tests skip and say so.

Changes to the grammar, the relevance rules, the digest diffing, the GitHub client (recorded
GraphQL fixtures under `packages/server/test/fixtures`) or API auth must come with tests. UI
changes need no unit tests but do need a screenshot in the PR when they are visible.

The same steps run in CI (`.github/workflows/run-tests.yml`) on every push and pull request. A
pull request with a red `run-tests` is not reviewed.

## Code style and layout

[Biome](https://biomejs.dev) formats and lints (`bun run lint`, `bun run lint:fix`): 2 spaces,
single quotes, semicolons, trailing commas, 110 columns. TypeScript strict everywhere; `any` is a
warning you should not add to.

| Path | What |
|---|---|
| `packages/shared` | The contract: zod schemas for items, settings, views and API envelopes; the search grammar (`search.ts`) shared by server and UI |
| `packages/server/src/routes` | Hono routes (`/api/*`, `/auth/*`, `/health`), the auth gate, static SPA |
| `packages/server/src/lib` | GitHub GraphQL client, relevance rules, syncer, poller, digest, notifiers, token source |
| `packages/server/src/db` | Drizzle schema for SQLite (`schema.ts`) and Postgres (`schema.pg.ts`, change both together); migrations under `src/db/migrations/{sqlite,postgres}` (additive only, `bun run db:generate` writes both) |
| `packages/web` | React SPA drawn with tailor (`tailor-react`); its own styles in `src/app.css` use `--t-*` tokens only |
| `public/tailor`, `vendor/tailor-react` | Vendored by tailor's tool (`managed by tailor` header): never edit, sync instead |

Conventions:

- Routes validate input (zod), call a function in `lib/`, return `jsonOk` / `jsonErr`. No business
  logic in route files.
- Every tunable is a `Settings` key (see `packages/shared/src/types.ts`), never a constant.
- No unbounded in-memory collections; background work is the single poller and the digest
  scheduler, nothing else.
- Parameterised SQL only; GitHub responses are validated with zod before they are stored.
- Logs are JSON lines on stdout with a subsystem prefix (`[http] [github] [poll] [digest] [notify]`).
- No GitHub write operations.

### Extension points

- **Notifier:** `packages/server/src/lib/notifiers/<name>.ts` + one line in `notifiers/index.ts`;
  steps in [docs/notifications.md](docs/notifications.md#adding-a-notifier).
- **View:** built-in views are rows, not code — append an entry to `BUILTIN_VIEWS` in
  `packages/shared/src/types.ts` with an id, a name and a search string. `{settingKey}`
  placeholders are substituted from Settings before parsing.
- **Search qualifier:** `packages/shared/src/search.ts` — update the doc comment, `QUALIFIERS`,
  `parseSearch` and `matchesItem`, and the table in `docs/search.md`.
- **Relevance rule:** `packages/server/src/lib/relevance.ts` holds pure functions over an `Item`;
  the test file is table-driven, so a rule is one function plus one row.
- **Theme:** skins and palettes come from tailor; see [docs/themes.md](docs/themes.md).
- **Token source:** implement `TokenSource` in `packages/server/src/lib/token.ts`.

## Commits and PRs

- Conventional commits: `feat(search): …`, `fix(digest): …`, `docs: …`, `refactor(server): …`,
  `chore(deps): …`. [release-please](https://github.com/googleapis/release-please) turns them into
  the changelog and the version bump; a `feat` bumps the minor, a `fix` the patch, `!` or a
  `BREAKING CHANGE:` footer the major. `chore` commits do not appear in the changelog.
- PR title = the conventional commit of the squash. Fill in the template.
- Every commit is GPG- or SSH-signed (`git config commit.gpgsign true`); the history on `main`
  is kept fully signed.
- Small, focused PRs. Refactors separate from behaviour changes.

## Documentation

The README holds only what is needed to run it. Everything else lives in `docs/`, one topic per
file — update the matching file in the same PR as the change:

| File | Content |
|---|---|
| `docs/SDD.md` | Design: purpose, architecture, data model, flows, decisions, scope, operations |
| `docs/features.md` | What it does, screenshots (`docs/screenshots/`) |
| `docs/configuration.md` | Environment variables and Settings keys |
| `docs/search.md` | Search grammar, views, keyboard shortcuts |
| `docs/api.md` | Every route, shape and status code |
| `docs/authentication.md` | UI gate, API token, session cookie, token source |
| `docs/notifications.md` | Digest behaviour, Discord, adding a notifier |
| `docs/themes.md` | Themes and how to add one |
| `docs/operations.md` | Health, logs, data, upgrade, rate limit |
| `docs/roadmap.md` | What is planned |
| `SECURITY.md` | Reporting vulnerabilities, what the app holds |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1; the same private reporting path |
| `CHANGELOG.md` | Generated by release-please from the commits — never edited by hand |

## Releasing

Merging to `main` runs `release.yml`: release-please opens or updates a release PR from the
conventional commits (changelog, version in `package.json`, the pinned tag in `compose.yaml`).
Merging that PR creates the `vX.Y.Z` tag and the GitHub release, and the same workflow builds the
multi-arch image and pushes `ghcr.io/rojosinalma/octotally:vX.Y.Z`, `:vX.Y` and `:latest`.
`workflow_dispatch` with an existing tag rebuilds and pushes the image for that tag.

## Licence

Octotally is AGPL-3.0. By contributing you agree that your contribution is licensed under the same
terms. If you run a modified instance for other people over a network, the AGPL requires you to
offer them the modified source.
