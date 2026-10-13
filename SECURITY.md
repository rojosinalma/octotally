# Security policy

## Reporting a vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/rojosinalma/octotally/security/advisories/new).
Do not open a public issue. You will get an acknowledgement within a week and a fix or a
statement before any public disclosure.

## Supported versions

Only the latest minor release receives fixes. Upgrade `ghcr.io/rojosinalma/octotally` to the
newest `vX.Y` tag before reporting.

## What the app holds

Octotally runs with a GitHub personal access token (`GITHUB_TOKEN`) and, optionally, a UI password,
a session secret and an API token. Keep in mind:

1. The token is read from the environment only; it is never written to the database, the logs or
   an API response. Give it read-only permissions (Issues, Pull requests, Discussions, Metadata).
2. The UI shows everything the token can see, including private repositories. Never expose an
   instance without authentication: set `AUTH_PASSWORD` or put it behind a reverse proxy that
   authenticates users.
3. When `API_TOKEN` is set, `/api/*` fails closed for requests without the bearer. When it is unset
   the API is as open as the UI, so the same rule applies.
4. The container runs as a non-root user, needs no capabilities and no Docker socket. Mount only
   the `/data` volume.
5. Octotally never writes to GitHub.
