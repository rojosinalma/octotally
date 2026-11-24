# tailor 2.3.1: reference

## Pick the page first

Find the kind of each page in this table; copy its layout (pack `layouts`, entries in
[reference/layouts.md](reference/layouts.md)), put it in the shell of the row, and give the `Page` that mode
(React `mode="fill"`, HTML `data-mode="fill"` on `t-page`).

| The page shows                                            | Copy                                                 | Shell                          | Page mode        |
| --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ | ---------------- |
| A list of records                                         | `list-page`                                          | `sidenav` or `topnav`          | `scroll`         |
| One record                                                | `detail-page`                                        | the shell of its list          | `scroll`         |
| The settings of the app                                   | `settings-page`                                      | `sidenav` or `topnav`          | `fill`           |
| An overview, a dashboard                                  | `dashboard-page`                                     | `sidenav` or `topnav`          | `scroll`         |
| A tool: inputs and a result (a preview, an output, a log) | `tool-page`                                          | `topnav`, also with no links   | `fill`           |
| Nothing yet: the first run, an empty list                 | `first-run-page`                                     | the shell of the app           | `scroll`         |
| Sign-in, an error, not found, offline                     | `sign-in`, `error-page`, `not-found`, `offline-page` | `bare` with `align="center"`   | no `Page`        |
| A form that adds or edits a record                        | `form-dialog`                                        | the shell of the page under it | that page's mode |
| A workspace, an editor: a tree, the item, panels          | `page` (example "fill"), `split`, `list-detail`      | `workspace`                    | `fill`           |

1. A page with a part that can grow without limit beside other parts (a picture, an output, a log next to a
   form) is a `fill` page: each part goes in a `Pane`, which scrolls alone, and a picture goes in a
   `MediaFit` (`t-media-fit`). The page itself then never scrolls.
2. A `scroll` page grows with its content and scrolls as one column. Never put a large picture in a `Card`
   of a scroll page: it grows the card and the page.
3. No kind fits: start from the nearest row, and keep its shell and its mode.

## Packs and shells of this project

This project has the packs `core`, `forms`, `data`, `command` and the shell `sidenav`. This file lists only what it has.
Before you build a page, add the shell and the packs that its row in the table above names (the layouts are
in the pack `layouts`), in the project folder:

```sh
tailor add --shell sidenav --packs <pack>,<pack>   # such as: --shell topnav --packs layouts
```

It copies their files, adds their entries to this reference, and prints the lines for `<head>` again: the
HTML kit needs the new stylesheet and script lines in every page, the React kit the new `bun add` line. A
project has one shell.

Shells it can add: `topnav`, `bare`, `workspace`.

Packs it can add:

- `pickers`: Date, time, date range, colour, file upload, rating and one-time code.
- `charts`: Line, area, donut and bar charts that follow the palette.
- `code`: Code colouring, code field, JSON viewer and diff viewer.
- `markdown`: Markdown view and an editor with preview.
- `chat`: Message list, composer and notices. React kit only.
- `sortable`: Drag to reorder lists, rows and cards. React kit only.
- `board`: Kanban board. React kit only.
- `calendar`: Calendar view of events. React kit only.
- `map`: A map frame with controls that follow the palette.
- `media`: Lightbox, carousel and thumbnail grid.
- `cropper`: Image cropper with zoom. React kit only.
- `tour`: Guided tour of a UI. React kit only.
- `pwa`: Install item, update notice, offline banner and offline data.
- `windows`: Floating windows that move, resize and minimise. React kit only.
- `layouts`: Standard page layouts with sample content, to copy: list with filters, detail, settings, dashboard, form dialog, first run, tool.

## How to use

1. Pick one shell (`topnav`, `sidenav`, `bare`, `workspace`) and give it data:
   brand, links, actions. Never write the frame yourself. The shell fills the screen: never add `contained`
   (`data-contained`), which only fits a preview of a shell into a box. HTML kit: write each link once. Top
   navigation: in the bar's list (`<nav class="t-shell-nav" data-t="topnav"><ul class="t-shell-list">`); the
   script builds the phone's drawer and the "More" menu from it. Side navigation: in the column's groups
   (`<div class="t-shell-sidebar" data-t="sidenav">` … `<nav class="t-shell-nav">`); the script builds the
   phone's drawer from them. Never write a `t-nav-drawer` yourself (only the bottom bar form has one).
2. Each view renders one `Page` (title, actions, body) inside the shell, with the mode of its row in the
   table above.
3. All spacing comes from layout parts: `Stack`, `Cluster`, `Grid`, `Section`, `Card`, `Split`. A component
   never sets its own margin; never add one.
4. Never write colours, sizes, fonts or class names of your own: skins and palettes set the look, and the props
   in the pack files list every allowed value.
5. Icons: `<Icon name="bi:house" />` in the React kit; in HTML markup
   `<svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-house"></use></svg>` (sets `bi` and
   `simple-icons`). Run `tailor icons` after adding a name: it finds both forms and adds them to the sprite.
   The small icons of tailor's own parts (close, chevron, help, the tones of an alert or a state) are in the
   sprite of an HTML kit project already: the reference markup draws them as
   `<svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg>`
   (`t-chevron-down`, `t-help`, `t-info`, `t-success`, `t-warning`, `t-danger`, …). Copy that line;
   never copy or write an icon's drawing (`<path d="…">`).
6. Where the files are, after `tailor add`:
   - a. React kit: the source in `<vendor>/tailor/`, imported as `tailor/<pack>`; stylesheets and
     `icons.svg` in `<public>/tailor/`.
   - b. HTML kit: `<public>/tailor/css/`, `js/`, `icons.svg`, and the markup of every example in
     `reference/<pack>/<component>.html`. Copy that markup; the script adds the behaviour.
   - c. The lines for `<head>`: `<public>/tailor/head.html`.
7. This file lists the components. Read the entry of a component (props, parts, one example in each kit) in
   `reference/<pack>.md` before you use it.
8. HTML kit, the page's own script: `Tailor.toast(tone, text)`, `await Tailor.confirm({ title, text, danger })`,
   `Tailor.busy(button, on)` (a spinner in place of the icon; it ignores clicks), `Tailor.upgrade(node)`. A
   `<form data-t="form" data-t-submit="fetch" action="…">` sends itself and keeps its submit button busy: a JSON
   answer `{ ok, message, errors }` shows as a toast and puts the errors on their fields; `t:send` fires as
   it sends (`detail.data`, the FormData, to show what is sent or add a field); any other answer (a
   picture, a file) comes in the `t:submit` event as `detail.blob` with `detail.response`, and a picture
   goes into the `t-media-fit` that `data-t-result="<its id>"` names, where a button with
   `data-t-download="<its id>"` saves it. Never write fetch or busy code for a form.
9. Settings that save themselves (pack `forms`, layout `settings-page`): each change is one request,
   `PATCH <saveUrl>` with the JSON `{ "name": "<control name>", "value": <text, number, true/false or null> }`;
   the server answers `204` or `{ "ok": true }`, or `{ "ok": false, "message": "…" }` and the row shows the
   failure, puts the old value back and offers retry. React kit: `useAutoSave({ value, save })`.

## Components

### Pack core: Core ([reference/core.md](reference/core.md))

- [Accordion](reference/core.md#accordion) (`accordion`, core): Sections that open and close under their titles.
- [Alert](reference/core.md#alert) (`alert`, core): A message inside the page flow, such as an error above a form.
- [Avatar](reference/core.md#avatar) (`avatar`, core): A person or a thing: an image, or the initials of the name when there is no image or it does not load.
- [Badge](reference/core.md#badge) (`badge`, core): A short label for a state or a category.
- [Banner](reference/core.md#banner) (`banner`, core): A notice across the top of the content region, such as "Connection lost" or "A new version is ready".
- [Bottom bar](reference/core.md#bottom-bar) (`bottom-bar`, core): Navigation at the bottom of a phone screen: up to five items, each an icon above a short label.
- [Bottom sheet](reference/core.md#bottom-sheet) (`bottom-sheet`, core): The phone form for a menu of choices or a short form: a sheet that slides up from the bottom and closes by a downward swipe, Escape or the backdrop.
- [Breadcrumb](reference/core.md#breadcrumb) (`breadcrumb`, core): Shows where the page sits: links to the pages above it and the current page as text.
- [Button group](reference/core.md#button-group) (`button-group`, core): Joins related buttons into one control with shared borders.
- [Button](reference/core.md#button) (`button`, core): Starts an action.
- [Card](reference/core.md#card) (`card`, core): A raised surface that groups content, with an optional header and footer.
- [Checkbox](reference/core.md#check) (`check`, core): A yes-or-no choice with its label, sent with the form.
- [Chip](reference/core.md#chip) (`chip`, core): A value the user added or can toggle: a tag or a filter.
- [Cluster](reference/core.md#cluster) (`cluster`, core): Puts its children in a row that wraps, with one gap between them.
- [Code block](reference/core.md#code-block) (`code-block`, core): Preformatted code with a copy button.
- [Combobox](reference/core.md#combobox) (`combobox`, core): Picks one value from a known set by typing to filter it.
- [Confirm](reference/core.md#confirm) (`confirm`, core): A question before a destructive or irreversible action; the text says the consequence.
- [Context menu](reference/core.md#context-menu) (`context-menu`, core): The menu of an area, opened at the pointer by a right click, a long press, the context-menu key or Shift+F10.
- [Counter](reference/core.md#counter) (`counter`, core): A number in a small pill, for counts in navigation and tabs.
- [Dialog](reference/core.md#dialog) (`dialog`, core): A window over the page for one task, such as an edit form.
- [Drawer](reference/core.md#drawer) (`drawer`, core): A panel that slides in from an edge over the page, for details or filters next to the current view.
- [Empty state](reference/core.md#empty-state) (`empty-state`, core): What a list, a table or a page shows when it has nothing: says what is empty and what to do next.
- [Error page](reference/core.md#error-page) (`error-page`, core): The page for a failure: a title, one sentence, Try again and Home, and the error in a closed Details section.
- [Facts](reference/core.md#facts) (`facts`, core): A list of keys and values.
- [Field](reference/core.md#field) (`field`, core): Puts one control in a form with its label, an optional help text and an error text.
- [Grid](reference/core.md#grid) (`grid`, core): Equal columns that fill the row and wrap, each at least the min width; the children in a row have equal height.
- [Help](reference/core.md#help) (`help`, core): A small round info button on the text line that opens a popover with an explanation of the field or value next to it.
- [History bars](reference/core.md#history-bars) (`history-bars`, core): A row of thin equal bars, one per period, each coloured by its tone, such as the uptime of the last 30 days.
- [Hover card](reference/core.md#hover-card) (`hover-card`, core): A link that shows a preview of its target when the pointer rests on it or the keyboard focuses it.
- [Icon](reference/core.md#icon) (`icon`, core): One icon from the project's sprite.
- [Text input](reference/core.md#input) (`input`, core): One line of text.
- [Keyboard key](reference/core.md#kbd) (`kbd`, core): A keyboard key, or a combination of keys with a plus between them.
- [List and detail](reference/core.md#list-detail) (`list-detail`, core): A list beside a detail view.
- [List](reference/core.md#list) (`list`, core): Rows of items for navigation-like or record-like lists.
- [Loading page](reference/core.md#loading-page) (`loading-page`, core): The pending state of a page: a centred spinner with a text, or the skeleton of a page.
- [Media fit](reference/core.md#media-fit) (`media-fit`, core): Shows one image, video, canvas or SVG at the largest size that fits the free width and height of its box, with its aspect ratio kept, centred; it never grows a pane, a card or the page.
- [Menu](reference/core.md#menu) (`menu`, core): A list of actions that opens from a button: items, links, checkbox items, radio groups, groups and separators.
- [Mini bar chart](reference/core.md#mini-bars) (`mini-bars`, core): A small bar chart from a few values, such as the load per core, as wide as its container.
- [Multi-select](reference/core.md#multi-select) (`multi-select`, core): Picks several values from a known set by typing to filter; the values show as chips in the box.
- [Navigation drawer](reference/core.md#nav-drawer) (`nav-drawer`, core): The navigation of a shell on a phone: a drawer from the start edge with the brand, every link (sub-items indented), the global actions, the footer facts and the theme controls.
- [Not found page](reference/core.md#not-found) (`not-found`, core): The page for an address that matches nothing: a title, one sentence and a link home.
- [Number field](reference/core.md#number) (`number`, core): A number with drawn step buttons.
- [Offline page](reference/core.md#offline-page) (`offline-page`, core): The page for no network connection: a glyph, a title, one sentence and Try again, which reloads.
- [Page](reference/core.md#page) (`page`, core): Fills the content region of a shell: a pinned header with the one h1 (and the state of the record beside it), and a body that scrolls or fills.
- [Pagination](reference/core.md#pagination) (`pagination`, core): Moves through the pages of a list: previous, next and the page numbers around the current one.
- [Pane](reference/core.md#pane) (`pane`, core): A box with a fixed header and a body that scrolls.
- [Popover](reference/core.md#popover) (`popover`, core): A small panel anchored to its trigger, for content and controls.
- [Progress bar](reference/core.md#progress) (`progress`, core): Shows how far a task of known length has got, such as an upload.
- [Prose](reference/core.md#prose) (`prose`, core): Styles long text that comes as plain HTML, such as rendered Markdown: headings, lists, quotes, code, tables and images.
- [Radio group](reference/core.md#radio) (`radio`, core): One choice from a few options that are all visible, each with room for a description.
- [Relative time](reference/core.md#relative-time) (`relative-time`, core): A point in time as "2 hours ago" or "in 3 days", kept up to date while the page is open.
- [Search field](reference/core.md#search) (`search`, core): A search field with a clear button.
- [Secret field](reference/core.md#secret) (`secret`, core): A secret value such as a password or a token, hidden until the reveal button shows it, with an optional copy button.
- [Section](reference/core.md#section) (`section`, core): A titled block inside a page, with optional actions at the end of its header.
- [Segmented control](reference/core.md#segmented) (`segmented`, core): Picks one of two to five short options that stay visible, such as a view switch or a filter state.
- [Select](reference/core.md#select) (`select`, core): Picks one value from a known set.
- [Separator](reference/core.md#separator) (`separator`, core): A line between groups, across or upright, with an optional label in the middle.
- [Shell parts](reference/core.md#shell-base) (`shell-base`, core): What every shell shares: the frame bound to the visible screen, the skip link, the brand, the navigation links, the footer facts and the theme controls.
- [Sign-in page](reference/core.md#sign-in) (`sign-in`, core): A centred sign-in card: brand, title, a real form that password managers fill (name or email, password, keep me signed in), the server's error above it, other ways under an "or" line, and links under it.
- [Skeleton](reference/core.md#skeleton) (`skeleton`, core): A grey placeholder in the shape of content that is still loading.
- [Slider](reference/core.md#slider) (`slider`, core): A value in a range, set by dragging or with the arrow keys.
- [Sparkline](reference/core.md#sparkline) (`sparkline`, core): A small line of values over time, optionally with the area under it, as wide as its container.
- [Spinner](reference/core.md#spinner) (`spinner`, core): Shows activity with no known length.
- [Split](reference/core.md#split) (`split`, core): Two panes with a handle between them that the user drags or moves with the arrow keys.
- [Stack](reference/core.md#stack) (`stack`, core): Puts its children in a column with one gap between them.
- [Stat](reference/core.md#stat) (`stat`, core): One number with its meaning, for dashboards: a label, a large value, a line of context and an optional small chart.
- [State label](reference/core.md#state-label) (`state-label`, core): A status in words with an icon, such as Running or Failed.
- [Status dot](reference/core.md#status-dot) (`status-dot`, core): A small dot for a live state next to a name.
- [Stepper](reference/core.md#stepper) (`stepper`, core): Shows the steps of a process and where the user is.
- [Switch](reference/core.md#switch) (`switch`, core): An on/off setting that applies at once.
- [Table](reference/core.md#table) (`table`, core): A plain table for a small, fixed set of rows.
- [Tabs](reference/core.md#tabs) (`tabs`, core): Switches between panels in one view (Tabs), or between the sub-pages of a page with the same look (NavTabs: a <nav> with data-kind="nav" and links).
- [Text area](reference/core.md#textarea) (`textarea`, core): Several lines of text.
- [Theme pickers](reference/core.md#theme-pickers) (`theme-pickers`, core): The controls that change the skin, the palette and the mode of the page, for a footer or a settings page.
- [Timeline](reference/core.md#timeline) (`timeline`, core): Events in time order, each with a toned marker on a line that connects them.
- [Toast](reference/core.md#toast) (`toast`, core): A short report of an outcome that leaves by itself after 4 s; a danger toast stays until closed.
- [Toolbar](reference/core.md#toolbar) (`toolbar`, core): One row of controls above content: filters at the start, actions at the end.
- [Tooltip](reference/core.md#tooltip) (`tooltip`, core): The name of an icon-only control, shown on hover and on keyboard focus, never on touch.
- [Truncate](reference/core.md#truncate) (`truncate`, core): Text cut to one line, or to two or three, with an ellipsis.

### Pack shell-sidenav: Side navigation shell ([reference/shell-sidenav.md](reference/shell-sidenav.md))

- [Side navigation shell](reference/shell-sidenav.md#sidenav) (`sidenav`, shell-sidenav): A frame with a left column: the brand, the global actions, the grouped links (sections open in place) and, at the bottom, the footer facts and the theme controls.

### Pack forms: Forms ([reference/forms.md](reference/forms.md))

- [Duration](reference/forms.md#duration) (`duration`, forms): A length of time as a number and a unit in words (seconds, minutes, hours, days).
- [Form](reference/forms.md#form) (`form`, forms): A validated form that never reloads the page: fields check on blur and on submit (then on each change until valid), a failed submit focuses the first invalid field, the outcome shows as a toast and server errors go on their fields.
- [Key-value editor](reference/forms.md#key-value-editor) (`key-value-editor`, forms): Edits pairs (environment variables, labels) as rows of a key and a value, with remove and Add.
- [List editor](reference/forms.md#list-editor) (`list-editor`, forms): Edits a list of values (hosts, patterns, tags) as rows: a text input, or a select when the values are known, with move up, move down and remove buttons, and an Add button.
- [Settings](reference/forms.md#settings) (`settings`, forms): A settings page that saves by itself: sections in a side list that marks the section in view (a row of links in a narrow container), rows of Setting with a readable label, a description, an optional help and the control at the end.

### Pack data: Data ([reference/data.md](reference/data.md))

- [Data table](reference/data.md#data-table) (`data-table`, data): A table for many rows: sorting, a search, column filters, pages, row selection with bulk actions and column visibility.
- [Log view](reference/data.md#log-view) (`log-view`, data): A log: monospace lines with a time and a level, ANSI colours in the palette hues, a filter that marks matches, a copy button, and follow, which keeps the end in view until the user scrolls up.
- [Long list](reference/data.md#long-list) (`long-list`, data): A list of very many rows that stays fast: only the rows in view are in the page.
- [Query view](reference/data.md#query-view) (`query-view`, data): The standard states of loaded data: loading (skeletons, only after 150 ms), an error with Try again, empty, or the content; a refetch keeps the content and shows a thin line on top.
- [Tree view](reference/data.md#tree-view) (`tree-view`, data): A tree of nested items, such as files or groups, with one tab stop and the arrow keys.

### Pack command: Command ([reference/command.md](reference/command.md))

- [Command palette](reference/command.md#command-palette) (`command-palette`, command): A searchable list of commands and places that Mod+K opens near the top of the screen; full screen on a phone.
- [Shortcuts help](reference/command.md#hotkeys-help) (`hotkeys-help`, command): A dialog that lists every registered keyboard shortcut by group, with a filter.
- [Keyboard shortcuts](reference/command.md#hotkeys) (`hotkeys`, command): One registry of the app's keyboard shortcuts: a provider at the root, a hook per shortcut and the keys to show.
