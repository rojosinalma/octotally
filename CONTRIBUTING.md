# Contributing

Thanks for helping. Octotally is small on purpose: one container, one language, a handful of
well-defined extension points. Keep it that way.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (CI and the image use 1.4)
- Docker (optional, for the container smoke test and the image)
- A GitHub token in `.env` (`cp .env.example .env`) if you want real data in the UI

## Setup

```sh
bun install
bun run dev        # server on :3000 (bun --watch) + Vite dev server on :5173
```

Open http://localhost:5173 during development; Vite proxies `/api` and `/health` to the server.
`bun run build` produces `packages/web/dist`, which the server serves on :3000.

## Verify before you push

```sh
bun run verify     # = bin/verify: typecheck, lint, tests, build, docker build + /health smoke
SKIP_DOCKER=1 bin/verify   # without the container part
```

The same steps run in CI (`.github/workflows/verify.yml`). A pull request with a red `verify` is not
reviewed.

## Commits and pull requests

- Conventional commits: `feat(search): …`, `fix(digest): …`, `docs: …`, `refactor(server): …`,
  `chore(deps): …`. [release-please](https://github.com/googleapis/release-please) turns them into
  the changelog and the version bump; a `feat` bumps the minor, a `fix` the patch, `!` or a
  `BREAKING CHANGE:` footer the major.
- PR title = the conventional commit of the squash. Fill in the template.
- Small, focused PRs. Refactors separate from behaviour changes.

## Code style

[Biome](https://biomejs.dev) formats and lints (`bun run lint`, `bun run lint:fix`): 2 spaces,
single quotes, semicolons, trailing commas, 110 columns. TypeScript strict everywhere; `any` is a
warning you should not add to.

Conventions:

- Routes validate input (zod), call a function in `lib/`, return `jsonOk` / `jsonErr`. No business
  logic in route files.
- Every tunable is a `Settings` key (see `packages/shared/src/types.ts`), never a constant.
- No unbounded in-memory collections; background work is the single poller and the digest
  scheduler, nothing else.
- Parameterised SQL only; GitHub responses are validated with zod before they are stored.
- Logs are JSON lines on stdout with a subsystem prefix (`[http] [github] [poll] [digest] [notify]`).

## Where things live

| Path | What |
|---|---|
| `packages/shared` | The contract: zod schemas for items, settings, views and API envelopes; the search grammar (`search.ts`) shared by server and UI |
| `packages/server/src/routes` | Hono routes (`/api/*`, `/health`), auth middleware, static SPA |
| `packages/server/src/lib` | GitHub GraphQL client, relevance rules, poller, digest, notifiers, token source |
| `packages/server/src/db` | Drizzle schema; migrations under `packages/server/drizzle` (additive only) |
| `packages/web` | React + Primer SPA |
| `docs/architecture.md` | Data flow, relevance rules, extension points |

## Adding a notifier

1. Create `packages/server/src/lib/notifiers/<name>.ts` exporting an object that implements the
   `Notifier` interface (`name`, `configured(settings)`, `send(digest, settings)`). Any settings it
   needs become keys in the `Settings` schema with defaults.
2. Add one line to the registry in `packages/server/src/lib/notifiers/index.ts`.
3. Add a test with a recorded payload. The Settings page lists registered notifiers automatically
   and `POST /api/notifiers/<name>/test` sends a test message.

## Adding a view

Built-in views are rows, not code: append an entry to `BUILTIN_VIEWS` in
`packages/shared/src/types.ts` with an id, a name and a search string. `{settingKey}` placeholders
are substituted from Settings before parsing.

## Adding a search qualifier or a relevance rule

- Grammar: `packages/shared/src/search.ts`. Update the doc comment, `QUALIFIERS`, `parseSearch`
  and `matchesItem`, and the README's syntax table.
- Relevance: `packages/server/src/lib/relevance.ts` holds pure functions over an `Item`; the test
  file is table-driven, so a rule is one function plus one row.

## Tests

`bun test` runs everything. Changes to the grammar, the relevance rules, the digest diffing, the
GitHub client (recorded GraphQL fixtures) or API auth must come with tests. UI changes need no unit
tests but do need a screenshot in the PR when they are visible.

## Licence

Octotally is AGPL-3.0. By contributing you agree that your contribution is licensed under the same
terms. If you run a modified instance for other people over a network, the AGPL requires you to
offer them the modified source.
