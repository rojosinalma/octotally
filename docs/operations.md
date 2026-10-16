# Operations

## Health

`GET /health` returns `200` with `{ok, db, version, lastSyncAt, githubRateRemaining}`, or `503`
when the database is unreachable. It is never gated. The image carries a `HEALTHCHECK` on it
(every 30 s, 20 s start period); point an uptime monitor at the same URL. `GET /api/status` has
the detailed sync state (last error, next run, rate limit, item count) behind the API gate.

## Logs

JSON lines on stdout (pino), one object per line with a `subsystem` field: `http` (one line per
request with method, path, status, ms), `github` (every GraphQL call with query name, cost and
remaining rate limit), `poll`, `digest`, `notify`, `db`, `boot`, `auth`. `LOG_LEVEL` sets the
verbosity (`trace` … `fatal`, `silent`). Tokens never appear in a log line.

```sh
docker compose logs -f octotally
docker compose logs octotally | jq -c 'select(.subsystem=="github")'
```

## Data

Everything lives under `DATA_DIR` (`/data` in the image): `octotally.db` (SQLite in WAL mode,
plus `-wal`/`-shm` side files) and `session.secret` when `SESSION_SECRET` is not set. Keep the
volume on local disk, not on a network filesystem. A backup is a copy of the directory while the
container is stopped, or `sqlite3 octotally.db ".backup out.db"` while it runs.

Rows are never deleted: items that leave `involves:` keep their row and local state, so the
database grows with your involvement, not with time. Activity is capped at `activityKeep` rows
per item.

## Upgrade

Migrations are additive and run on every boot, so upgrading is pulling the new image:

```sh
docker compose pull && docker compose up -d
```

`compose.yaml` pins a `vX.Y.Z` tag; `latest` follows every release and `vX.Y` the latest patch of
a minor. The version in `/health` and `GET /api/version` confirms what runs. Downgrading to a
version older than the schema in the database is not supported; restore the backup instead.

## GitHub rate limit

Each sync is one `viewer` query, two paged `search` queries (issues/PRs and discussions, 50 per
page) and one id-only search per role qualifier. The remaining budget is logged after every call
and shown in `/health` and `/api/status`. A sync is skipped while the remaining budget is below
the previous sync's measured cost, and failures (including `403` rate limiting) back off
exponentially from `pollIntervalMin` up to `backoffMaxMin`. The UI keeps serving the stored data
while GitHub is unavailable.

## Shutdown

`SIGINT`/`SIGTERM` stop the poller, let in-flight requests finish, close the database and exit 0.
