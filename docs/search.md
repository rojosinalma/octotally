# Search syntax and views

## Search syntax

A GitHub-compatible subset. Terms are ANDed; prefix a qualifier with `-` to negate it. The same
grammar (`packages/shared/src/search.ts`) runs in the browser for instant filtering and on the
server for the authoritative query (`GET /api/items?q=`). An empty query means `hidden:none`.

| Qualifier | Values | Notes |
|---|---|---|
| `is:` | `open` `closed` `merged` `draft` `answered` `unanswered` `issue` `pr` `discussion` | `merged`/`draft` apply to PRs, `answered` to discussions |
| `type:` | `issue` `pr` `discussion` | plurals accepted |
| `state:` | `open` `closed` `merged` | |
| `repo:` | `owner/name` | |
| `org:` / `user:` | `owner` | |
| `author:` `assignee:` | `login` or `@me` | `@me` is the login the token belongs to |
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
view") or via `POST /api/views` (see [api.md](api.md#views)). Built-in views can be renamed and
reordered but keep their query.

## Keyboard

`j`/`k` move the selection, `e` marks done, `m` mutes, `o` opens the item on GitHub, `/` focuses
the search bar and `?` shows the shortcuts dialog.
