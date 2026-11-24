# tailor 2.3.1: pack data (Data)

Data table, long list, tree view, log viewer and the views for loading, error and empty.

Requires: core. Libraries (React kit): @tanstack/react-table@9.3.1, @tanstack/react-virtual@3.14.26, @tanstack/react-query@5.107.1. HTML kit: full.

SVG drawing data in the markup shows as `d="…"`, inline images as `data:…`, and markup over 4000 characters is cut. The HTML kit has each example whole in `reference/data/<component>.html`.

<a id="data-table"></a>

## Data table (`data-table`)

A table for many rows: sorting, a search, column filters, pages, row selection with bulk actions and column visibility. It looks like the plain table and follows its narrow forms. HTML kit: a server-rendered t-table inside <div class="t-data-table" data-t="data-table" data-page-size="20">; th carry data-sort, data-filter and data-priority, cells may carry data-value, rows data-row-id; data-initial-search on the root and data-filter-value on a th open it on a filtered state (React: initialSearch, initialFilters); data-selectable adds the boxes and fires t:selection with the ids; buttons in a [data-t-bulk] slot show while rows are selected and fire t:bulk. Without the script the full table shows.

- React: `import { DataTable } from "tailor/data";`
- Classes: `t-data-table`; parts: `t-data-table-sort` the button in a sortable th; the th carries aria-sort; `t-data-table-check` the cell that holds the box of a row or of the page; `t-data-table-sortby` the Sort by control in the toolbar, shown only while the rows are cards; `t-data-table-selection` the selected count, the bulk actions and the clear button in the toolbar; `t-data-table-footer` the row under the table: the count, the pages and the rows per page; `t-data-table-count` the count text: 21–40 of 312; `t-data-table-size` the rows-per-page control
- Props: `density`: default | compact; `narrow`: cards | scroll; `sort`: text | num | date; `filter`: select | text
- HTML kit: script

Example: 300 services

```tsx
<WithBulk />
```

```html
<div class="t-stack"><div class="t-data-table" data-t="data-table" data-page-size="20" data-selectable=""><div class="t-data-table-bulk" data-t-bulk="" hidden=""><button type="button" class="t-btn" data-size="sm" data-action="restart">Restart</button><button type="button" class="t-btn" data-size="sm" data-variant="danger" data-action="stop">Stop</button></div><div class="t-table-wrap"><table class="t-table" aria-label="Services"><thead><tr><th scope="col" data-sort="text" aria-sort="ascending">Name</th><th scope="col" data-sort="text" data-filter="select">Host</th><th scope="col" data-sort="text" data-filter="select">Status</th><th scope="col" data-priority="low" data-sort="text">Image</th><th scope="col" data-kind="num" data-sort="num">Memory (MB)</th><th scope="col" data-sort="text">Updated</th></tr></thead><tbody><tr data-row-id="api-1"><th scope="row" data-label="Name">api-1</th><td data-label="Host">web-1</td><td data-label="Status" data-value="running"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td><td data-label="Image" data-priority="low">example/api:2.3</td><td data-label="Memory (MB)" data-kind="num">32</td><td data-label="Updated" data-value="2026-11-15T11:00:00.000Z"><time class="t-time" dateTime="2026-11-15T11:00:00.000Z" title="November 15, 2026 at 12:00 PM" data-t="relative-time">1 week ago</time></td></tr><tr data-row-id="api-2"><th scope="row" data-label="Name">api-2</th><td data-label="Host">db-1</td><td data-label="Status" data-value="running"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td><td data-label="Image" data-priority="low">example/api:3.6</td><td data-label="Memory (MB)" data-kind="num">1196</td><td data-label="Updated" data-value="2026-11-15T01:36:00.000Z"><time class="t-time" dateTime="2026-11-15T01:36:00.000Z" title="November 15, 2026 at 2:36 AM" data-t="relative-time">1 week ago</time></td></tr><tr data-row-id="api-3"><th scope="row" data-label="Name">api-3</th><td data-label="Host">nas</td><td data-label="Status" data-value="degraded"><span class="t-state" data-tone="warning"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-warning"></use></svg></span>Degraded</span></td><td data-label="Image" data-priority="low">example/api:4.9</td><td data-label="Memory (MB)" data-kind="num">460</td><td data-label="Updated" data-value="2026-11-14T16:12:00.000Z"><time class="t-time" dateTime="2026-11-14T16:12:00.000Z" title="November 14, 2026 at 5:12 PM" data-t="relative-time">1 week ago</time></td></tr><tr data-row-id="api-4"><th scope="row" data-label="Name">api-4</th><td data-label="Host">web-2</td><td data-label="Status" data-value="running"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td><td data-label="Image" data-priority="low">example/api:1.2</td><td data-label="Memory (MB)" data-kind="num">1624</td><td data-label="Updated" data-value="2026-11-14T06:48:00.000Z"><time class="t-time" dateTime="2026-11-14T06:48:00.000Z" title="November 14, 2026 at 7:48 AM" data-t="relative-time">1 week ago</time></td></tr><tr data-row-id="api-5"><th scope="row" data-label="Name">api-5</th><td data-label="Host">edge</td><td data-label="Status" data-value="stopped"><span class="t-state" data-tone="neutral">Stopped</span></td><td data-label="Image" data-priority="low">example/api:2.5</td><td data-label="Memory (MB)" data-kind="num">0</td><td data-label="Updated" data-value="2026-11-13T21:24:00.000Z">
<!-- … cut here; the whole markup: reference/data/data-table.html -->
```

<a id="log-view"></a>

## Log view (`log-view`)

A log: monospace lines with a time and a level, ANSI colours in the palette hues, a filter that marks matches, a copy button, and follow, which keeps the end in view until the user scrolls up. It fills its parent. HTML kit: <pre class="t-log" data-t="log" aria-label="…"> with the raw text, or <ol class="t-log" data-t="log"> with <li data-level="warn" data-time="10:00:01"> lines; data-wrap wraps long lines, data-follow="off" starts without follow, data-max-lines (default 2000) caps the lines. Append with element.append(…) and a t:append event, or window.Tailor.log(element).append(text, { time, level }); a button with data-t-append="#<log id>" and data-text (optional data-time, data-level) appends that line on click, with no script of its own. React renders every line up to 300 shown lines and only the lines in view above that; the HTML kit renders every line.

- React: `import { LogView } from "tailor/data";`
- Classes: `t-log`; parts: `t-log-bar` the filter, the follow switch and the copy button; `t-log-view` the box that scrolls, with the name of the log; `t-log-lines` the lines (ol, or the pre of the HTML kit); `t-log-line` one line; data-level and data-tone from its level; `t-log-time` the time column; `t-log-level` the level in words; `t-log-text` the text; ANSI runs carry data-fg, data-bold and data-dim; `t-log-mark` a match of the filter; `t-log-jump` the Jump to end button, shown while follow is off
- Props: `level`: error | warn | info | debug
- HTML kit: script

Example: 500 lines

```tsx
<LogView label="Service log" lines={lines} />
```

```html
<ol class="t-log" data-t="log" aria-label="Service log"><li data-level="info" data-time="10:00:00">[32mOK[0m backup of web-1 done: 1,204 files, 20 MB, written to /srv/backup/web-1/2026-11-15/0.tar with checksum [35m0[0m</li><li data-level="debug" data-time="10:00:07">cache hit for key session:alice:1 [2mweb-2[0m</li><li data-level="info" data-time="10:00:14">[32mOK[0m GET /api/items/2 [34m200[0m in 94ms from nas</li><li data-level="warn" data-time="10:00:21">slow answer from db-1 in [33m131ms[0m [2m(limit 500ms)[0m</li><li data-level="info" data-time="10:00:28">[32mOK[0m GET /api/items/4 [34m200[0m in 168ms from web-1</li><li data-level="error" data-time="10:00:35">[1;31mfailed[0m GET https://example.com/api/items/5 from web-2: timeout after [36m2050ms[0m</li><li data-level="debug" data-time="10:00:42">cache miss for key session:alice:6 [2mnas[0m</li><li data-level="info" data-time="10:00:49">[32mOK[0m GET /api/items/7 [34m200[0m in 279ms from db-1</li><li data-level="info" data-time="10:00:56">[32mOK[0m GET /api/items/8 [34m200[0m in 316ms from web-1</li><li data-level="info" data-time="10:01:03">[32mOK[0m GET /api/items/9 [34m200[0m in 353ms from web-2</li><li data-level="warn" data-time="10:01:10">slow answer from nas in [33m390ms[0m [2m(limit 500ms)[0m</li><li data-level="debug" data-time="10:01:17">cache hit for key session:alice:11 [2mdb-1[0m</li><li data-level="info" data-time="10:01:24">[32mOK[0m GET /api/items/12 [34m200[0m in 464ms from web-1</li><li data-level="info" data-time="10:01:31">[32mOK[0m GET /api/items/13 [34m200[0m in 501ms from web-2</li><li data-level="info" data-time="10:01:38">[32mOK[0m GET /api/items/14 [34m200[0m in 538ms from nas</li><li data-level="info" data-time="10:01:45">[32mOK[0m GET /api/items/15 [34m200[0m in 575ms from db-1</li><li data-level="debug" data-time="10:01:52">cache miss for key session:alice:16 [2mweb-1[0m</li><li data-level="warn" data-time="10:01:59">slow answer from web-2 in [33m649ms[0m [2m(limit 500ms)[0m</li><li data-level="info" data-time="10:02:06">[32mOK[0m GET /api/items/18 [34m200[0m in 686ms from nas</li><li data-level="info" data-time="10:02:13">[32mOK[0m GET /api/items/19 [34m200[0m in 723ms from db-1</li><li data-level="info" data-time="10:02:20">[32mOK[0m GET /api/items/20 [34m200[0m in 760ms from web-1</li><li data-level="debug" data-time="10:02:27">cache hit for key session:alice:21 [2mweb-2[0m</li><li data-level="error" data-time="10:02:34">[1;31mfailed[0m GET https://example.com/api/items/22 from nas: timeout after [36m8340ms[0m</li><li data-level="info" data-time="10:02:41">[32mOK[0m GET /api/items/23 [34m200[0m in 871ms from db-1</li><li data-level="warn" data-time="10:02:48">slow answer from web-1 in [33m908ms[0m [2m(limit 500ms)[0m</li><li data-level="info" data-time="10:02:55">[32mOK[0m GET /api/items/25 [34m200[0m in 45ms from web-2</li><li data-level="debug" data-time="10:03:02">cache miss for key session:alice:26 [2mnas[0m</li><li data-level="info" data-time="10:03:09">[32mOK[0m GET /api/items/27 [34m200[0m in 119ms from db-1</li><li data-level="info" data-time="10:03:16">[32mOK[0m GET /api/items/28 [34m200[0m in 156ms from web-1</li><li data-level="info" data-time="10:03:23">[32mOK[0m GET /api/items/29 [34m200[0m in 193ms from web-2</li><li data-level="info" data-time="10:03:30">[32mOK[0m GET /api/items/30 [34m200[0m in 230ms from nas</li><li data-level="warn" data-time="10:03:37">slow answer from db-1 in [33m267ms[0m [2m(limit 500ms)[0m</li><li data-level="info" data-time="10:03:44">[32mOK[0m GET /api/items/32 [34m200[0m in 304ms from web-1</li><li data-level="info" data-time="10:03:51">[32mOK[0m backup of web-2 done: 1,204 files, 341 MB, written to /srv/backup/web-2/2026-11-15/33.tar with checksum [35m146526afd1[0m</li><li data-level="info" data-time="10:03:58">[32mOK[0m GET /api/items/34 [34m200[0m in 378ms from nas</li>
<!-- … cut here; the whole markup: reference/data/log-view.html -->
```

<a id="long-list"></a>

## Long list (`long-list`)

A list of very many rows that stays fast: only the rows in view are in the page. It scrolls in its own box and fills its parent, for fill-mode pages and panes. React only: the HTML kit shows long lists in pages with pagination.

- React: `import { LongList } from "tailor/data";`
- Classes: `t-long-list`; parts: `t-long-list-inner` the list (ul), as tall as all rows together; the rows above the view are space at its top; `t-long-list-item` one row; `t-long-list-more` the spinner row at the end while more rows load
- HTML kit: none

Example: 10,000 rows of different heights

```tsx
<LongList label="Events" items={many} itemKey={(e) => e.id} renderItem={row} />
```

<a id="query-view"></a>

## Query view (`query-view`)

The standard states of loaded data: loading (skeletons, only after 150 ms), an error with Try again, empty, or the content; a refetch keeps the content and shows a thin line on top. React: takes any query of the shape { status, data, error, isFetching, refetch }. HTML kit: the server picks one of the blocks: <div class="t-query" data-state="loading" aria-busy="true"> with t-skeleton parts, data-state="error" around a danger t-alert, data-state="empty" around a t-empty, or the content in a plain t-query (with aria-busy="true" and a t-query-progress first while it refreshes).

- React: `import { QueryView } from "tailor/data";`
- Classes: `t-query`; parts: `t-query-progress` the thin line on top while data refreshes
- Props: `state`: loading | error | empty
- HTML kit: markup

Example: Loading

```tsx
<QueryView query={fixed<Host[]>({ status: "pending", isFetching: true })} loading={skeleton}>
  {(rows) => <HostTable rows={rows} />}
</QueryView>
```

```html
<div class="t-query" data-state="loading" aria-busy="true"><div class="t-stack" data-gap="2"><div class="t-skeleton" data-shape="box" data-size="sm" aria-hidden="true"></div><div class="t-skeleton" aria-hidden="true"><span class="t-skeleton-line"></span><span class="t-skeleton-line"></span><span class="t-skeleton-line"></span><span class="t-skeleton-line"></span></div></div></div>
```

<a id="tree-view"></a>

## Tree view (`tree-view`)

A tree of nested items, such as files or groups, with one tab stop and the arrow keys. HTML kit: nested <ul class="t-tree" data-t="tree" aria-label="…"> and <li class="t-tree-item" data-id="…"> lists with a link or a t-tree-label; data-open on an open item, data-selected on a selected one, aria-disabled="true" on a disabled one, aria-multiselectable on the tree. The script makes each line a tree item (state in aria-expanded and aria-selected), adds the keys and opening, and fires t:select with the selected ids. Without the script every item shows.

- React: `import { TreeView } from "tailor/data";`
- Classes: `t-tree`; parts: `t-tree-item` one item (li): its line and its children; `t-tree-row` the line of an item, the tree item itself: it carries aria-expanded, aria-selected and aria-disabled, and owns the group; `t-tree-toggle` the chevron of a branch; an empty place on a leaf; `t-tree-icon` the icon of the item; `t-tree-label` the label: text, or a link; `t-tree-count` the counter after the label, part of the name of the item; `t-tree-actions` buttons for the item, shown on the selected item and under the pointer; `t-tree-group` the children of an item, with the indent guide; `t-tree-loading` the spinner row while the children of an item load
- HTML kit: script

Example: Files

```tsx
<TreeView
  label="Files"
  nodes={files}
  defaultExpanded={["src", "src/lib"]}
  defaultSelected={["src/lib/api.ts"]}
  renderActions={(node) => (
    <Button
      size="sm"
      variant="ghost"
      icon={<Glyph body={more} />}
      label={`Actions for ${node.label}`}
    />
  )}
/>
```

```html
<ul class="t-tree" data-t="tree" aria-label="Files"><li class="t-tree-item" data-id="src" data-open=""><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-folder"></use></svg></span><span class="t-tree-label" id="_R_0_-src">src</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for src"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div><ul class="t-tree-group"><li class="t-tree-item" data-id="src/components"><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-folder"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Fcomponents">components</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for components"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div><ul class="t-tree-group"><li class="t-tree-item" data-id="src/components/button.tsx"><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-file-earmark-code"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Fcomponents_2Fbutton.tsx">button.tsx</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for button.tsx"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div></li><li class="t-tree-item" data-id="src/components/dialog.tsx"><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-file-earmark-code"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Fcomponents_2Fdialog.tsx">dialog.tsx</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for dialog.tsx"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div></li><li class="t-tree-item" data-id="src/components/menu.tsx"><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-file-earmark-code"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Fcomponents_2Fmenu.tsx">menu.tsx</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for menu.tsx"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div></li><li class="t-tree-item" data-id="src/components/table.tsx"><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-file-earmark-code"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Fcomponents_2Ftable.tsx">table.tsx</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for table.tsx"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></span></div></li></ul></li><li class="t-tree-item" data-id="src/lib" data-open=""><div class="t-tree-row"><span class="t-tree-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-folder"></use></svg></span><span class="t-tree-label" id="_R_0_-src_2Flib">lib</span><span class="t-tree-actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for lib">
<!-- … cut here; the whole markup: reference/data/tree-view.html -->
```
