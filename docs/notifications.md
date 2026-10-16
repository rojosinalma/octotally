# Notifications

Octotally sends digests through notifiers. Discord (webhook) is the one that ships today; adding
another is one file, see [Adding a notifier](#adding-a-notifier).

## Discord digest

Set `discordWebhookUrl` in Settings (an `https://` Discord webhook) and enable either or both:

- **Daily** (`digestDaily`) at `digestHour` in `timezone`: everything the tracker noticed since the
  previous daily digest, grouped by item (`repo#n (type) — title`, one indented line per event),
  excluding `done` items, with `N active · M need a PR` as footer. It is sent once per local day,
  at or after `digestHour`, by the poll cycle that first finds it due.
- **Realtime** (`digestRealtime`): a short message right after each poll that found new activity
  on non-hidden items — the activity of that sync only. Items first seen on a later sync appear as
  `New issue: <title>`.

Digests are cut by when the tracker *noticed* an event (`seenAt`), not by GitHub's timestamp, and
are keyed by the last-sent timestamp in the `digests` table, so a restart never re-sends. Identical
payloads are de-duplicated for 48 h by hash. A failing webhook is logged with its stack trace and
retried on the next cycle; it never blocks the poll or crashes the process.

Discord chunks at 4000 characters per embed and 10 embeds per request.

## Testing and sending by hand

- **Send test** on the Settings page, or `POST /api/notifiers/discord/test`, posts a sample
  message (`400` when the notifier is not configured, `502` when the webhook fails).
- `POST /api/digest/send` builds and sends the daily digest now.
- `GET /api/notifiers` lists the registered notifiers with their configured state.

## Adding a notifier

1. Create `packages/server/src/lib/notifiers/<name>.ts` exporting an object that implements the
   `Notifier` interface: `name`, `label`, `configured(settings)`, `send(message, settings)`.
   Configuration comes from settings only: any key it needs becomes part of the shared `Settings`
   schema (`packages/shared/src/types.ts`) with a default.
2. Add one entry to the registry in `packages/server/src/lib/notifiers/index.ts`.
3. Add a test with a recorded payload. The Settings page lists registered notifiers automatically
   and `POST /api/notifiers/<name>/test` sends a test message.

A `DigestMessage` is `{kind: daily|realtime|test, title, lines[], footer?}`; lines are Markdown
(`**[repo#n (type) — title](url)**` followed by `  · YYYY-MM-DD HH:MM <summary> ([link](url))`).
Notifiers chunk as their transport needs.
