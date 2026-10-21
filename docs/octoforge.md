# Octoforge

[Octoforge](https://github.com/rojosinalma/octoforge) is an umbrella for a few small GitHub tools,
Octotally among them. It shows one card per tool, can create a GitHub token for a tool and hand it
over, and can host the tools' databases side by side. Octotally implements version 1 of its
[member contract](https://github.com/rojosinalma/octoforge/blob/main/docs/members.md).

All of this is optional. If you run Octotally on its own, leave `OCTOFORGE_TOKEN` empty and
nothing on this page applies: the routes below do not exist and every one of them answers `404`.

## Turning it on

Set `OCTOFORGE_TOKEN` to a long random value (`openssl rand -hex 32`) in Octotally's `.env`, and
the same value in Octoforge's `.env`, then restart Octotally.

Every route lives under `/api/octoforge`. Apart from the manifest, each one needs
`Authorization: Bearer <OCTOFORGE_TOKEN>`. The compare runs in constant time and a wrong or
missing token gets `401`. These routes have their own gate: `API_TOKEN` and the `AUTH_PASSWORD`
session cookie do not open them, and `OCTOFORGE_TOKEN` opens nothing else under `/api`.

Answers use the usual envelope, `{ok, message, ...data}`, with `kind` on errors (see
[api.md](api.md)). No route ever returns a token, a password or a database URL, and none of them
end up in a log line.

## The manifest

`octoforge.json` at the root of the repository describes Octotally to Octoforge: name, icon,
health path, which GitHub credentials it takes, which databases it can run on and which
environment variables it reads. The image ships the same file, and `GET /api/octoforge/manifest`
serves it without a bearer.

Octotally takes a personal access token only, no GitHub App: it has to act as you to find
everything that involves you, and an App cannot do that. The manifest asks for:

- **Classic token**: `repo` and `read:discussion`. If you only care about public repositories,
  `public_repo` instead of `repo` works too.
- **Fine-grained token**: read-only *Issues*, *Pull requests*, *Discussions* and *Metadata*.

## Routes

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/octoforge/manifest` | The `octoforge.json` document. No bearer. |
| `GET` | `/api/octoforge/status` | Contract version, app version, where the GitHub token and the database come from. |
| `PUT` | `/api/octoforge/github` | Hand over a GitHub token. |
| `DELETE` | `/api/octoforge/github` | Forget the handed-over token and go back to `GITHUB_TOKEN`. |
| `POST` | `/api/octoforge/database/adopt` | Move the data to another database. |
| `DELETE` | `/api/octoforge/database` | Undo the move (after a restart). |

### `GET /status`

```json
{
  "ok": true,
  "message": "ok",
  "contract": 1,
  "version": "0.2.0",
  "github": { "mode": "pat", "source": "octoforge", "login": "octocat" },
  "database": { "engine": "postgres", "schema": "octotally", "source": "octoforge" }
}
```

`github.source` is `octoforge` for a handed-over token, `env` for `GITHUB_TOKEN` and `none` when
there is no token at all (then `mode` is `null`). `database.source` says the same about the
database.

### `PUT /github`

Body: `{"mode": "pat", "token": "github_pat_…"}`. `mode: "app"` gets `400 octotally supports only
pat`.

Octotally checks the token with `GET https://api.github.com/user` before it keeps it:

- GitHub says `401` or `403`: `400`, with GitHub's reason in `message`.
- The token belongs to something other than a user (a bot, an App): `400`.
- GitHub cannot be reached or answers `5xx`: `502`.

On success the answer is `{ok, message, login, restart_required: false}`. The token takes effect
at once and a sync starts right away, also when the instance booted without any token.

### `DELETE /github`

Drops the handed-over token. The next sync uses `GITHUB_TOKEN` again, or shows the "no token"
state if that is empty. Answer: `{ok, message, restart_required: false}`.

## Which token wins, and how it is stored

A token handed over by Octoforge wins over `GITHUB_TOKEN`. It is read on every sync, so a `PUT` or
`DELETE` applies to the next sync without a restart.

The token lives in the `settings` table under the key `octoforge.github_token`. That key is not
part of the settings schema, so `GET /api/settings` never shows it and `PUT /api/settings` cannot
change it. It is encrypted: AES-256-GCM with a fresh random IV on every write, and a key derived
with HKDF-SHA-256 from the session secret (`SESSION_SECRET`, or `DATA_DIR/session.secret`). The
database can end up in a shared Postgres where a read-only role can read every table, so a plain
token there would be a leak.

If you rotate the session secret, the stored token can no longer be decrypted. Octotally logs one
warning (without the value) and falls back to `GITHUB_TOKEN` until Octoforge hands the token over
again.

## Moving the database

Octotally runs on SQLite by default (`DATA_DIR/octotally.db`) and also on Postgres, in a schema of
its own (see [configuration.md](configuration.md#database)). Octoforge can move it into a shared
database: one Postgres schema per tool, or one SQLite file per tool in a shared directory.

### `POST /database/adopt`

Body: `{"url": "postgres://…", "schema": "octotally", "copy": true}`.

- `url` starts with `postgres://`, `postgresql://` or `sqlite:` (for example
  `sqlite:/shared/octotally.db`).
- `schema` matches `^[a-z_][a-z0-9_]*$` and defaults to `octotally`. SQLite ignores it.
- `copy` defaults to `true`.

What happens:

1. Octotally connects to `url`, creates the schema if it is missing and runs its own migrations
   there.
2. With `copy: true` it copies every row from the current database and compares the row counts
   per table. Any difference aborts the move and the current database stays in use.
3. It writes `url` and `schema` to `DATA_DIR/octoforge-database.json` (mode 0600). At start-up
   that file overrides `DATABASE_URL` and `DATABASE_SCHEMA`.
4. It answers `{ok, message, tables: {<table>: <rows>}, restart_required: true}`.

Nothing changes until you restart Octotally; then it runs on the new database. A bad request is
`400`, a database that cannot be reached is `502`, anything else is `500`. The URL is never
echoed back.

### Rolling back

The old database is never touched, so rolling back is two steps:

1. `DELETE /api/octoforge/database` removes `DATA_DIR/octoforge-database.json` and answers
   `{ok, message, removed, restart_required: true}`.
2. Restart Octotally. It uses `DATABASE_URL` (or the default SQLite file) again.

Rows written after the move stay in the new database only: done and muted marks set in between are
lost on rollback, while everything else comes back from GitHub on the next sync.
