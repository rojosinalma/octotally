# Authentication

An instance tracks the involvement of one GitHub account — the one the token belongs to — and
shows everything that token can see, private repositories included. Decide who may reach the UI
before exposing it beyond localhost.

## Options

1. **None** — only on a trusted network. `/api/*` is open; the UI shows everything the token can
   see.
2. **`AUTH_PASSWORD`** — a login form and a signed session cookie. The cookie
   (`octotally_session`) is HttpOnly, SameSite=Lax, valid 30 days, and `Secure` when the request is
   https or carries `X-Forwarded-Proto: https`. The HMAC key is `SESSION_SECRET`, or a secret
   generated once and persisted at `DATA_DIR/session.secret`.
3. **Reverse proxy** — Cloudflare Access, Authelia, Authentik, oauth2-proxy… in front of the
   container; leave `AUTH_PASSWORD` empty.
4. **`API_TOKEN`** — for scripts: `Authorization: Bearer <token>` on `/api/*` (constant-time
   compare). It is an extra credential next to the UI gate and never locks the browser out: with
   `AUTH_PASSWORD` set, a request needs the session cookie *or* the bearer; without it the API is
   as open as the UI.

| Situation | `/api/*` access |
|---|---|
| `AUTH_PASSWORD` not set | open — put the instance behind your proxy's auth |
| `AUTH_PASSWORD` set | valid `octotally_session` cookie |
| `API_TOKEN` set (either case) | `Authorization: Bearer <API_TOKEN>` is always accepted as an alternative |

The [Octoforge routes](octoforge.md) under `/api/octoforge` are outside this table: they need
`Authorization: Bearer <OCTOFORGE_TOKEN>` (the manifest excepted) and exist only when that variable
is set.

Anything else → `401 {ok:false, kind:"auth", message:"authentication required"}`. `/health` and
`/auth/*` are never gated. The SPA bundle is served regardless (it carries no data); the SPA calls
`GET /auth/status` and shows the login form when `required && !authenticated`.

## Auth routes

| Method | Route | Response |
|---|---|---|
| `GET` | `/auth/status` | `{ok, message, authenticated, required}` |
| `POST` | `/auth/login` body `{password}` | `{ok, message, authenticated, required}` + `Set-Cookie`; `401` on a wrong password, `400` without `password` |
| `POST` | `/auth/logout` | clears the cookie |

## GitHub token source

The GitHub token is read through the `TokenSource` interface (`packages/server/src/lib/token.ts`);
nothing else knows where it comes from. `LayeredToken` uses a token handed over by Octoforge when
there is one ([octoforge.md](octoforge.md#which-token-wins-and-how-it-is-stored)) and
`GITHUB_TOKEN` otherwise. A GitHub OAuth login
(no personal access token) is on the [roadmap](roadmap.md) and slots in as a second implementation
of that interface.
