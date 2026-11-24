# tailor 2.3.1: pack core (Core)

Tokens, skins, palettes, theme switch, icons, layout parts and the components that nearly every UI uses.

Requires: nothing. Libraries (React kit): react@19.3.1, react-dom@19.3.1, @base-ui/react@1.9.0, @tanstack/react-router@1.170.46; types: @types/react@19.2.7, @types/react-dom@19.2.3. HTML kit: full.

SVG drawing data in the markup shows as `d="…"`, inline images as `data:…`, and markup over 4000 characters is cut. The HTML kit has each example whole in `reference/core/<component>.html`.

<a id="accordion"></a>

## Accordion (`accordion`)

Sections that open and close under their titles. By default one is open at a time; with multiple, each opens on its own. The HTML kit uses <details>, which works with no script.

- React: `import { Accordion } from "tailor/core";`
- Classes: `t-accordion`; parts: `t-accordion-item` one section; open: [data-open] (React kit) or [open] (HTML kit); `t-accordion-trigger` the title row that opens and closes the section; `t-accordion-icon` the chevron, which turns when the section is open; `t-accordion-panel` the content of the section
- HTML kit: markup

Example: One section at a time

```tsx
<Accordion items={hosts} defaultOpen={["web-1"]} />
```

```html
<div class="t-accordion"><details class="t-accordion-item" name="_R_0_" open=""><summary class="t-accordion-trigger"><span class="t-accordion-title">web-1</span><span class="t-accordion-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-down"></use></svg></span></summary><div class="t-accordion-panel"><p>Serves example.com and its API. Up for 41 days.</p></div></details><details class="t-accordion-item" name="_R_0_"><summary class="t-accordion-trigger"><span class="t-accordion-title">web-2</span><span class="t-accordion-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-down"></use></svg></span></summary><div class="t-accordion-panel"><p>Stand-by for web-1. Takes over within a minute.</p></div></details><details class="t-accordion-item" name="_R_0_"><summary class="t-accordion-trigger"><span class="t-accordion-title">nas</span><span class="t-accordion-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-down"></use></svg></span></summary><div class="t-accordion-panel"><p>Holds the backups and the shared folders of alice.</p></div></details></div>
```

<a id="alert"></a>

## Alert (`alert`)

A message inside the page flow, such as an error above a form. Danger and warning are announced at once. In the HTML kit the app handles the close button.

- React: `import { Alert } from "tailor/core";`
- Classes: `t-alert`; parts: `t-alert-icon` the glyph of the tone; `t-alert-content` the title and the text; `t-alert-title` the title, optional; `t-alert-text` the message; `t-alert-actions` buttons under the message, optional; `t-alert-close` the close button, only when the alert can be closed
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Tones

```tsx
<Stack>
  {TONES.map((tone) => (
    <Alert key={tone} tone={tone}>
      {`Tone ${tone}: a message about the host web-1.`}
    </Alert>
  ))}
</Stack>
```

```html
<div class="t-stack"><div class="t-alert" data-tone="neutral" role="status"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone neutral: a message about the host web-1.</div></div></div><div class="t-alert" data-tone="accent" role="status"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone accent: a message about the host web-1.</div></div></div><div class="t-alert" data-tone="success" role="status"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone success: a message about the host web-1.</div></div></div><div class="t-alert" data-tone="warning" role="alert"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-warning"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone warning: a message about the host web-1.</div></div></div><div class="t-alert" data-tone="danger" role="alert"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-danger"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone danger: a message about the host web-1.</div></div></div><div class="t-alert" data-tone="info" role="status"><span class="t-alert-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></span><div class="t-alert-content"><div class="t-alert-text">Tone info: a message about the host web-1.</div></div></div></div>
```

<a id="avatar"></a>

## Avatar (`avatar`)

A person or a thing: an image, or the initials of the name when there is no image or it does not load.

- React: `import { Avatar } from "tailor/core";`
- Classes: `t-avatar`; parts: `t-avatar-image` the image, over the initials; `t-avatar-initials` the initials of the name
- Props: `size`: sm | md | lg; `shape`: circle | square
- HTML kit: markup

Example: Initials, in three sizes

```tsx
<Cluster>
  <Avatar name="Alice Martin" size="sm" />
  <Avatar name="Alice Martin" />
  <Avatar name="Alice Martin" size="lg" />
</Cluster>
```

```html
<div class="t-cluster"><span class="t-avatar" role="img" aria-label="Alice Martin" data-size="sm"><span class="t-avatar-initials" aria-hidden="true">AM</span></span><span class="t-avatar" role="img" aria-label="Alice Martin"><span class="t-avatar-initials" aria-hidden="true">AM</span></span><span class="t-avatar" role="img" aria-label="Alice Martin" data-size="lg"><span class="t-avatar-initials" aria-hidden="true">AM</span></span></div>
```

<a id="badge"></a>

## Badge (`badge`)

A short label for a state or a category. One line; long text ends in an ellipsis.

- React: `import { Badge } from "tailor/core";`
- Classes: `t-badge`; parts: `t-badge-label` the text
- Props: `tone`: neutral | accent | success | warning | danger | info; `variant`: soft | solid | outline
- HTML kit: markup

Example: Tones and variants

```tsx
<Stack>
  {VARIANTS.map((variant) => (
    <Cluster key={variant} gap="2">
      {TONES.map((tone) => (
        <Badge key={tone} tone={tone} variant={variant}>
          {tone}
        </Badge>
      ))}
    </Cluster>
  ))}
</Stack>
```

```html
<div class="t-stack"><div class="t-cluster" data-gap="2"><span class="t-badge" data-tone="neutral"><span class="t-badge-label">neutral</span></span><span class="t-badge" data-tone="accent"><span class="t-badge-label">accent</span></span><span class="t-badge" data-tone="success"><span class="t-badge-label">success</span></span><span class="t-badge" data-tone="warning"><span class="t-badge-label">warning</span></span><span class="t-badge" data-tone="danger"><span class="t-badge-label">danger</span></span><span class="t-badge" data-tone="info"><span class="t-badge-label">info</span></span></div><div class="t-cluster" data-gap="2"><span class="t-badge" data-tone="neutral" data-variant="solid"><span class="t-badge-label">neutral</span></span><span class="t-badge" data-tone="accent" data-variant="solid"><span class="t-badge-label">accent</span></span><span class="t-badge" data-tone="success" data-variant="solid"><span class="t-badge-label">success</span></span><span class="t-badge" data-tone="warning" data-variant="solid"><span class="t-badge-label">warning</span></span><span class="t-badge" data-tone="danger" data-variant="solid"><span class="t-badge-label">danger</span></span><span class="t-badge" data-tone="info" data-variant="solid"><span class="t-badge-label">info</span></span></div><div class="t-cluster" data-gap="2"><span class="t-badge" data-tone="neutral" data-variant="outline"><span class="t-badge-label">neutral</span></span><span class="t-badge" data-tone="accent" data-variant="outline"><span class="t-badge-label">accent</span></span><span class="t-badge" data-tone="success" data-variant="outline"><span class="t-badge-label">success</span></span><span class="t-badge" data-tone="warning" data-variant="outline"><span class="t-badge-label">warning</span></span><span class="t-badge" data-tone="danger" data-variant="outline"><span class="t-badge-label">danger</span></span><span class="t-badge" data-tone="info" data-variant="outline"><span class="t-badge-label">info</span></span></div></div>
```

<a id="banner"></a>

## Banner (`banner`)

A notice across the top of the content region, such as "Connection lost" or "A new version is ready". One line that wraps on a phone. In the HTML kit the app handles the close button.

- React: `import { Banner } from "tailor/core";`
- Classes: `t-banner`; parts: `t-banner-icon` the glyph of the tone; `t-banner-text` the message; `t-banner-action` the action button, optional; `t-banner-close` the close button, only when the banner can be closed
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Tones

```tsx
<Stack>
  <Banner tone="danger">Connection lost. Changes are kept until it is back.</Banner>
  <Banner tone="warning">web-1 runs on its backup disk.</Banner>
  <Banner tone="success">All services are up again.</Banner>
  <Banner tone="info">alice changed the settings of this page.</Banner>
</Stack>
```

```html
<div class="t-stack"><div class="t-banner" data-tone="danger" role="alert"><span class="t-banner-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-danger"></use></svg></span><div class="t-banner-text">Connection lost. Changes are kept until it is back.</div></div><div class="t-banner" data-tone="warning" role="alert"><span class="t-banner-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-warning"></use></svg></span><div class="t-banner-text">web-1 runs on its backup disk.</div></div><div class="t-banner" data-tone="success" role="status"><span class="t-banner-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span><div class="t-banner-text">All services are up again.</div></div><div class="t-banner" data-tone="info" role="status"><span class="t-banner-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></span><div class="t-banner-text">alice changed the settings of this page.</div></div></div>
```

<a id="bottom-bar"></a>

## Bottom bar (`bottom-bar`)

Navigation at the bottom of a phone screen: up to five items, each an icon above a short label. With more items the fifth is "More", which opens the navigation drawer. It sits above the safe area.

- React: `import { BottomBar } from "tailor/core";`
- Classes: `t-bottom-bar`; parts: `t-bottom-bar-list` the list of items; `t-bottom-bar-item` one item, a link or the "More" button; the current page has aria-current="page"; `t-bottom-bar-icon` the icon of an item; `t-bottom-bar-label` the label of an item, one line that truncates
- Props: `items`: text or content; `drawer`: text or content
- HTML kit: markup

Example: Five items

```tsx
<Phone items={FIVE} />
```

```html
<div class="t-shell" data-shell="bare" data-t="shell"><a class="t-shell-skip" href="#_R_0_">Skip to content</a><header class="t-shell-bar"><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span><span class="t-shell-brand-name">Console</span></a><dialog class="t-drawer t-nav-drawer" id="_R_0H1_" data-t="dialog nav-drawer" data-side="start" aria-label="Menu"><header class="t-drawer-header"><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span><span class="t-shell-brand-name">Console</span></a><button type="button" class="t-drawer-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-drawer-body t-nav-drawer-body"><nav class="t-shell-nav" aria-label="Main navigation"><div class="t-shell-group"><ul class="t-shell-list"><li><a href="#overview" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-speedometer2"></use></svg></span><span class="t-shell-label">Overview</span></a></li><li><a href="#services" aria-current="page" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-stack"></use></svg></span><span class="t-shell-label">Services</span><span class="t-counter" data-tone="neutral">3</span></a></li><li><a href="#hosts" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-pc-display"></use></svg></span><span class="t-shell-label">Hosts</span></a></li><li><a href="#deploys" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-rocket-takeoff"></use></svg></span><span class="t-shell-label">Deploys</span></a></li><li><a href="#settings" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-gear"></use></svg></span><span class="t-shell-label">Settings</span></a></li></ul></div></nav></div><div class="t-nav-drawer-footer"><ul class="t-shell-facts"><li class="t-shell-fact">Version 2.4.1</li><li class="t-shell-fact"><a href="https://example.com/docs">Docs</a></li></ul><div class="t-shell-theme"><div class="t-theme-pickers" data-t="theme-pickers" data-parts="mode" data-layout="compact"></div></div></div></dialog></header><main class="t-shell-main" id="_R_0_" tabindex="-1"><div class="t-page"><header class="t-page-header"><div class="t-page-heading"><h1 class="t-page-title" id="_R_l_">Services</h1><p class="t-page-description">What runs on every host.</p></div><div class="t-page-actions"><button type="button" class="t-btn" data-variant="primary">Add service</button></div></header><section class="t-page-body" tabindex="0" aria-labelledby="_R_l_"><div class="t-grid" data-min="2xs"><div class="t-stat" data-tone="success"><div class="t-stat-label">Running</div><div class="t-stat-value">12</div></div><div class="t-stat" data-tone="warning"><div class="t-stat-label">Degraded</div><div class="t-stat-value">1</div></div><div class="t-stat"><div class="t-stat-label">Hosts</div><div class="t-stat-value">3</div></div></div><div class="t-toolbar"><div class="t-toolbar-start"><div class="t-control t-input-group t-search" data-t="search" data-size="sm" data-shortcut="off"><span class="t-input-addon t-search-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></span><input type="search" class="t-input-native" placeholder="Filter" aria-label="Filter services" autoComplete="off" value=""/></div></div><div class="t-toolbar-end"><button type="button" class="t-btn" data-size="sm">Export</button></div></div>
<!-- … cut here; the whole markup: reference/core/bottom-bar.html -->
```

<a id="bottom-sheet"></a>

## Bottom sheet (`bottom-sheet`)

The phone form for a menu of choices or a short form: a sheet that slides up from the bottom and closes by a downward swipe, Escape or the backdrop. It is the drawer with side bottom. On a wide screen prefer Popover, Menu or Dialog.

- React: `import { BottomSheet } from "tailor/core";`
- Classes: `t-drawer`; parts: `t-drawer-handle` the grab bar, on touch screens; `t-drawer-header` title row with the close button; `t-drawer-title` the title; `t-drawer-close` the close button; `t-drawer-body` the content, which scrolls when it is long; `t-drawer-footer` the actions, at the end
- HTML kit: script

Example: A menu of choices

```tsx
<BottomSheet trigger={<Button>Actions for web-1</Button>} title="web-1">
  <Stack gap="2">
    {["Restart", "Show the log", "Move to nas"].map((label) => (
      <DialogClose key={label}>
        <Button variant="ghost">{label}</Button>
      </DialogClose>
    ))}
  </Stack>
</BottomSheet>
```

```html
<button type="button" class="t-btn" data-t-open="_R_0_">Actions for web-1</button><dialog class="t-drawer" id="_R_0_" data-t="dialog drawer" data-side="bottom" aria-labelledby="_R_0_-title"><div class="t-drawer-handle" aria-hidden="true"></div><header class="t-drawer-header"><h2 class="t-drawer-title" id="_R_0_-title">web-1</h2><button type="button" class="t-drawer-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-drawer-body"><div class="t-stack" data-gap="2"><button type="button" class="t-btn" data-variant="ghost" data-t-close="">Restart</button><button type="button" class="t-btn" data-variant="ghost" data-t-close="">Show the log</button><button type="button" class="t-btn" data-variant="ghost" data-t-close="">Move to nas</button></div></div></dialog>
```

<a id="breadcrumb"></a>

## Breadcrumb (`breadcrumb`)

Shows where the page sits: links to the pages above it and the current page as text. In a narrow container only the first item, an ellipsis and the last two show.

- React: `import { Breadcrumb } from "tailor/core";`
- Classes: `t-breadcrumb`; parts: `t-breadcrumb-list` the <ol> of items; `t-breadcrumb-item` one item: a link, or the current page as text with aria-current="page"; `t-breadcrumb-more` the ellipsis that stands for the hidden middle items in a narrow container
- HTML kit: markup

Example: Three levels

```tsx
<Breadcrumb
  items={[{ label: "Home", to: "#home" }, { label: "Hosts", to: "#hosts" }, { label: "web-1" }]}
/>
```

```html
<nav class="t-breadcrumb" aria-label="Breadcrumb"><ol class="t-breadcrumb-list"><li class="t-breadcrumb-item"><a href="#home">Home</a></li><li class="t-breadcrumb-item"><a href="#hosts">Hosts</a></li><li class="t-breadcrumb-item"><span aria-current="page">web-1</span></li></ol></nav>
```

<a id="button-group"></a>

## Button group (`button-group`)

Joins related buttons into one control with shared borders. It never wraps: in a narrow space the buttons shrink and their text truncates.

- React: `import { ButtonGroup } from "tailor/core";`
- Classes: `t-btn-group`
- Props: `label`: text or content
- HTML kit: markup

Example: Text buttons

```tsx
<ButtonGroup label="Service">
  <Button>Start</Button>
  <Button>Stop</Button>
  <Button>Restart</Button>
</ButtonGroup>
```

```html
<div class="t-btn-group" role="group" aria-label="Service"><button type="button" class="t-btn">Start</button><button type="button" class="t-btn">Stop</button><button type="button" class="t-btn">Restart</button></div>
```

<a id="button"></a>

## Button (`button`)

Starts an action. A view has at most one primary button. ButtonLink has the same look for an action that goes to another page; `loading` shows a spinner and ignores clicks.

- React: `import { Button, ButtonLink } from "tailor/core";`
- Classes: `t-btn`; parts: `t-btn-label` the text, when the button also holds an icon; `t-btn-spinner` the spinner of a loading button, in place of the icon
- Props: `variant`: default | primary | danger | ghost | link; `size`: sm | md | lg
- HTML kit: markup

Example: Variants

```tsx
<Cluster>
  <Button>Default</Button>
  <Button variant="primary">Primary</Button>
  <Button variant="danger">Danger</Button>
  <Button variant="ghost">Ghost</Button>
  <Button variant="link">Link</Button>
</Cluster>
```

```html
<div class="t-cluster"><button type="button" class="t-btn">Default</button><button type="button" class="t-btn" data-variant="primary">Primary</button><button type="button" class="t-btn" data-variant="danger">Danger</button><button type="button" class="t-btn" data-variant="ghost">Ghost</button><button type="button" class="t-btn" data-variant="link">Link</button></div>
```

<a id="card"></a>

## Card (`card`)

A raised surface that groups content, with an optional header and footer. With an address, the whole card is a link. A card is a size container: put it in a stack or a grid, not in a row that sizes to content.

- React: `import { Card } from "tailor/core";`
- Classes: `t-card`; parts: `t-card-header` the header: title, description and actions; `t-card-title` the heading; `t-card-link` the link in the title of a clickable card; its hit area covers the card; `t-card-description` a line under the title; `t-card-actions` buttons at the end of the header; `t-card-body` the content; `t-card-footer` the footer row
- Props: `padding`: default | none; `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Title, body and footer

```tsx
<Card
  title="web-1"
  description="Web server in the main region"
  actions={<Badge tone="success">running</Badge>}
  footer={
    <>
      <Button variant="ghost">Logs</Button>
      <Button>Restart</Button>
    </>
  }
>
  <Facts
    items={[
      { key: "Address", value: "10.0.4.21", mono: true },
      { key: "Image", value: "registry.example.com/team/web:2026.11.15", mono: true },
      { key: "Uptime", value: "14 days" },
      { key: "Owner", value: "alice" },
    ]}
  />
</Card>
```

```html
<div class="t-card"><div class="t-card-header"><h2 class="t-card-title">web-1</h2><p class="t-card-description">Web server in the main region</p><div class="t-card-actions"><span class="t-badge" data-tone="success"><span class="t-badge-label">running</span></span></div></div><div class="t-card-body"><dl class="t-facts"><div class="t-facts-row"><dt class="t-facts-key">Address</dt><dd class="t-facts-value" data-mono="">10.0.4.21</dd></div><div class="t-facts-row"><dt class="t-facts-key">Image</dt><dd class="t-facts-value" data-mono="">registry.example.com/team/web:2026.11.15</dd></div><div class="t-facts-row"><dt class="t-facts-key">Uptime</dt><dd class="t-facts-value">14 days</dd></div><div class="t-facts-row"><dt class="t-facts-key">Owner</dt><dd class="t-facts-value">alice</dd></div></dl></div><div class="t-card-footer"><button type="button" class="t-btn" data-variant="ghost">Logs</button><button type="button" class="t-btn">Restart</button></div></div>
```

<a id="check"></a>

## Checkbox (`check`)

A yes-or-no choice with its label, sent with the form. A check group labels several related checkboxes.

- React: `import { Check, CheckGroup } from "tailor/core";`
- Classes: `t-check`; parts: `t-check-input` the drawn box: a native checkbox in the HTML kit, the Base UI checkbox in React; `t-check-label` the label text; the whole t-check is the hit area; `t-check-description` an optional line under the label; `t-check-group` a fieldset that holds related checkboxes; `t-check-group-label` the legend of a check group
- HTML kit: script

Example: Alone

```tsx
<Check name="terms" value="yes" label="I accept the terms" />
```

```html
<label class="t-check"><input class="t-check-input" aria-labelledby="_R_0_-label" type="checkbox" name="terms" value="yes"/><span class="t-check-label" id="_R_0_-label">I accept the terms</span></label>
```

<a id="chip"></a>

## Chip (`chip`)

A value the user added or can toggle: a tag or a filter. It can carry a remove button, or be a toggle button itself.

- React: `import { Chip } from "tailor/core";`
- Classes: `t-chip`; parts: `t-chip-label` the text; `t-chip-check` the check mark of a toggle chip; it shows while aria-pressed is true; `t-chip-remove` the button that removes the chip; its name is “Remove <label>”
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Removable tags

```tsx
<Tags />
```

```html
<div class="t-cluster" data-gap="2"><span class="t-chip"><span class="t-chip-label">web-1</span><button type="button" class="t-chip-remove" aria-label="Remove web-1"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></span><span class="t-chip"><span class="t-chip-label">nas</span><button type="button" class="t-chip-remove" aria-label="Remove nas"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></span><span class="t-chip"><span class="t-chip-label">owner:alice</span><button type="button" class="t-chip-remove" aria-label="Remove owner:alice"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></span><span class="t-chip"><span class="t-chip-label">region:eu</span><button type="button" class="t-chip-remove" aria-label="Remove region:eu"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></span></div>
```

<a id="cluster"></a>

## Cluster (`cluster`)

Puts its children in a row that wraps, with one gap between them.

- React: `import { Cluster } from "tailor/core";`
- Classes: `t-cluster`
- Props: `gap`: 0 | 1 | 2 | 3 | 4 | 5 | 6; `align`: start | center | end | stretch | baseline; `justify`: start | center | end | between
- HTML kit: markup

Example: A row that wraps

```tsx
<Cluster>
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</Cluster>
```

```html
<div class="t-cluster"><button type="button" class="t-btn">First</button><button type="button" class="t-btn">Second</button><button type="button" class="t-btn">Third</button></div>
```

<a id="code-block"></a>

## Code block (`code-block`)

Preformatted code with a copy button. With a title, a header bar holds it and the button; without one, there is no bar and an icon-only copy button sits at the top end corner over the code. Long lines scroll sideways inside the block, or wrap with `wrap`.

- React: `import { CodeCopy, CodeBlock } from "tailor/core";`
- Classes: `t-code`; parts: `t-code-header` the row above the code, only with a title: the title and the copy button; `t-code-title` the title, such as a file name; `t-code-corner` without a title: holds the copy button at the top end corner, over the code; `t-code-copy` the copy button; it shows a check for a moment after copying; without a title it is icon-only, over the code; `t-code-pre` the <pre><code> that holds the code; it takes the focus so the keyboard can scroll it
- Props: `code`: text or content; `title`: text or content; `label`: text or content; `wrap`: true
- HTML kit: script

Example: With a title

```tsx
<CodeBlock title="compose.yaml" code={compose} />
```

```html
<div class="t-code" data-t="code-block"><div class="t-code-header"><span class="t-code-title">compose.yaml</span><button type="button" class="t-btn t-code-copy" data-variant="ghost" data-size="sm"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-copy"></use></svg><span class="t-btn-label" aria-live="polite">Copy</span></button></div><pre class="t-code-pre" tabindex="0" role="group" aria-label="compose.yaml"><code>services:
  web-1:
    image: nginx:1.27
    ports:
      - &quot;8080:80&quot;
    volumes:
      - ./site:/usr/share/nginx/html:ro
    restart: unless-stopped</code></pre></div>
```

<a id="combobox"></a>

## Combobox (`combobox`)

Picks one value from a known set by typing to filter it. With allowCustom it also keeps a typed value. On a phone the list opens as a bottom sheet.

- React: `import { Combobox } from "tailor/core";`
- Classes: `t-combobox`; parts: `t-combobox-clear` the clear button, shown while there is a value; also a t-input-action; `t-combobox-trigger` the chevron that opens the list; also a t-input-action; `t-combobox-popup` the list surface, also a t-popup; `t-option` one choice; `t-combobox-description` a line under the label of a choice; `t-combobox-empty` the line shown when no choice matches; `t-combobox-status` the line shown while the choices load
- Props: `size`: sm | md | lg
- HTML kit: script

Example: With a placeholder

```tsx
<Combobox options={hosts} name="host" aria-label="Host" placeholder="Pick a host" />
```

```html
<select name="host" aria-label="Host" class="t-control t-select" data-t="combobox" data-placeholder="Pick a host"><option value="" selected="">Pick a host</option><option value="web-1">web-1</option><option value="web-2">web-2</option><option value="nas">nas</option><option value="console" disabled="">console</option></select>
```

<a id="confirm"></a>

## Confirm (`confirm`)

A question before a destructive or irreversible action; the text says the consequence. Focus starts on Cancel; Escape and the backdrop cancel. React: render <ConfirmRegion /> once, then await confirm({ title, text, confirmLabel, cancelLabel, danger }) from useConfirm(). HTML: await window.Tailor.confirm({ … }), or declaratively <button data-t="confirm-trigger" data-title="…" data-text="…" data-confirm-label="…" data-danger data-result-target="#out">, which writes "true" or "false" into the target and fires a bubbling "t-confirm" event with the answer in detail.

- React: `import { ConfirmRegion, useConfirm } from "tailor/core";`
- Classes: `t-dialog`; parts: `t-dialog-header` the title row; `t-dialog-title` the question; `t-dialog-body` the consequence, one paragraph; `t-dialog-footer` Cancel and the confirm button
- HTML kit: script

Example: Before a destructive and an irreversible action

```tsx
<Stack>
  <ConfirmRegion />
  <Ask
    label="Delete web-1"
    result="confirm-delete"
    options={{
      title: "Delete web-1?",
      text: "The host and its three services go away for good. Their backups on nas stay.",
      confirmLabel: "Delete",
      danger: true,
    }}
  />
  <Ask
    label="Restart nas"
    result="confirm-restart"
    options={{
      title: "Restart nas?",
      text: "The shares are offline for about two minutes.",
      confirmLabel: "Restart",
    }}
  />
</Stack>
```

```html
<div class="t-stack"><div class="t-cluster" data-align="center"><button type="button" class="t-btn" data-variant="danger" data-t="confirm-trigger" data-title="Delete web-1?" data-text="The host and its three services go away for good. Their backups on nas stay." data-confirm-label="Delete" data-danger="" data-result-target="#confirm-delete">Delete web-1</button><output id="confirm-delete" aria-label="Answer to Delete web-1"></output></div><div class="t-cluster" data-align="center"><button type="button" class="t-btn" data-t="confirm-trigger" data-title="Restart nas?" data-text="The shares are offline for about two minutes." data-confirm-label="Restart" data-result-target="#confirm-restart">Restart nas</button><output id="confirm-restart" aria-label="Answer to Restart nas"></output></div></div>
```

<a id="context-menu"></a>

## Context menu (`context-menu`)

The menu of an area, opened at the pointer by a right click, a long press, the context-menu key or Shift+F10. Many people never find it: always offer the same actions in a visible menu button too. Takes the same items as the menu.

- React: `import { ContextMenu } from "tailor/core";`
- Classes: `t-context-menu`; parts: `t-menu` the menu that opens; see the menu component
- HTML kit: script

Example: On an area, paired with a visible menu button

```tsx
<Cluster align="center">
  <ContextMenu label="Host actions" items={actions}>
    <Stack gap="1">
      <strong>web-1.example.com</strong>
      <span>
        Host <AppLink to="#web-1">web-1</AppLink> serves 3 services.
      </span>
    </Stack>
  </ContextMenu>
  <Menu
    trigger={<Button variant="ghost" icon={<Glyph body={more} />} label="Host actions" />}
    label="Host actions"
    align="end"
    items={actions}
  />
</Cluster>
```

```html
<div class="t-cluster" data-align="center"><div class="t-context-menu" data-t="context-menu" data-t-menu="_R_1_"><div class="t-stack" data-gap="1"><strong>web-1.example.com</strong><span>Host <a href="#web-1">web-1</a> serves 3 services.</span></div></div><div class="t-popup t-menu" id="_R_1_" role="menu" aria-label="Host actions" hidden=""><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="restart"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-retry"></use></svg></span><span class="t-menu-label">Restart</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="copy"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-copy"></use></svg></span><span class="t-menu-label">Copy address</span></button><div class="t-menu-separator" role="separator" aria-orientation="horizontal"></div><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="stop" aria-disabled="true"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-stop-circle"></use></svg></span><span class="t-menu-label">Stop</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="delete" data-tone="danger"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-trash"></use></svg></span><span class="t-menu-label">Delete host</span></button></div><button type="button" class="t-btn" data-variant="ghost" data-icon-only="" aria-label="Host actions" data-t="menu" data-t-menu="_R_2_" aria-haspopup="menu" aria-expanded="false"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button><div class="t-popup t-menu" id="_R_2_" role="menu" aria-label="Host actions" data-align="end" hidden=""><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="restart"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-retry"></use></svg></span><span class="t-menu-label">Restart</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="copy"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-copy"></use></svg></span><span class="t-menu-label">Copy address</span></button><div class="t-menu-separator" role="separator" aria-orientation="horizontal"></div><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="stop" aria-disabled="true"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-stop-circle"></use></svg></span><span class="t-menu-label">Stop</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="delete" data-tone="danger"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-trash"></use></svg></span><span class="t-menu-label">Delete host</span></button></div></div>
```

<a id="counter"></a>

## Counter (`counter`)

A number in a small pill, for counts in navigation and tabs. Above max it shows max+.

- React: `import { Counter } from "tailor/core";`
- Classes: `t-counter`
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Tones

```tsx
<Cluster gap="2">
  {TONES.map((tone, i) => (
    <Counter key={tone} tone={tone} value={(i + 1) * 3} />
  ))}
</Cluster>
```

```html
<div class="t-cluster" data-gap="2"><span class="t-counter" data-tone="neutral">3</span><span class="t-counter" data-tone="accent">6</span><span class="t-counter" data-tone="success">9</span><span class="t-counter" data-tone="warning">12</span><span class="t-counter" data-tone="danger">15</span><span class="t-counter" data-tone="info">18</span></div>
```

<a id="dialog"></a>

## Dialog (`dialog`)

A window over the page for one task, such as an edit form. On a phone it takes the full screen.

- React: `import { Dialog, DialogClose } from "tailor/core";`
- Classes: `t-dialog`; parts: `t-dialog-backdrop` the dimmed layer behind the dialog; `t-dialog-header` title row with the close button; `t-dialog-title` the title; `t-dialog-close` the close button; `t-dialog-body` the content, which scrolls when it is long; `t-dialog-footer` the actions, at the end
- Props: `size`: sm | md | lg; `placement`: center | top
- HTML kit: script

Example: With a trigger

```tsx
<Dialog
  trigger={<Button>Edit host</Button>}
  title="Edit host"
  footer={
    <>
      <DialogClose>
        <Button>Cancel</Button>
      </DialogClose>
      <DialogClose>
        <Button variant="primary">Save</Button>
      </DialogClose>
    </>
  }
>
  <p>The host web-1 serves three services. A change here applies at once.</p>
</Dialog>
```

```html
<button type="button" class="t-btn" data-t-open="_R_0_">Edit host</button><dialog class="t-dialog" id="_R_0_" data-t="dialog" aria-labelledby="_R_0_-title"><header class="t-dialog-header"><h2 class="t-dialog-title" id="_R_0_-title">Edit host</h2><button type="button" class="t-dialog-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-dialog-body"><p>The host web-1 serves three services. A change here applies at once.</p></div><footer class="t-dialog-footer"><button type="button" class="t-btn" data-t-close="">Cancel</button><button type="button" class="t-btn" data-variant="primary" data-t-close="">Save</button></footer></dialog>
```

<a id="drawer"></a>

## Drawer (`drawer`)

A panel that slides in from an edge over the page, for details or filters next to the current view. On a phone a side drawer takes at most 85% of the width and a bottom drawer is a sheet. Size full takes the whole screen, for a region that becomes a drawer on a phone.

- React: `import { Drawer } from "tailor/core";`
- Classes: `t-drawer`; parts: `t-drawer-backdrop` the dimmed layer behind the drawer; `t-drawer-handle` the grab bar of a bottom drawer, on touch screens; a downward swipe on it or the header closes; `t-drawer-header` title row with the close button; `t-drawer-title` the title; `t-drawer-close` the close button; `t-drawer-body` the content, which scrolls when it is long; `t-drawer-footer` the actions, at the end
- Props: `side`: start | end | bottom; `size`: sm | md | full
- HTML kit: script

Example: From the end

```tsx
<Drawer trigger={<Button>Host details</Button>} title="Host details" footer={footer}>
  {details}
</Drawer>
```

```html
<button type="button" class="t-btn" data-t-open="_R_0_">Host details</button><dialog class="t-drawer" id="_R_0_" data-t="dialog drawer" aria-labelledby="_R_0_-title"><header class="t-drawer-header"><h2 class="t-drawer-title" id="_R_0_-title">Host details</h2><button type="button" class="t-drawer-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-drawer-body"><div class="t-stack"><p>web-1 serves three services from the rack in room 2.</p><p>Last deploy: 14 minutes ago, by alice.</p></div></div><footer class="t-drawer-footer"><button type="button" class="t-btn" data-t-close="">Cancel</button><button type="button" class="t-btn" data-variant="primary" data-t-close="">Save</button></footer></dialog>
```

<a id="empty-state"></a>

## Empty state (`empty-state`)

What a list, a table or a page shows when it has nothing: says what is empty and what to do next.

- React: `import { EmptyState } from "tailor/core";`
- Classes: `t-empty`; parts: `t-empty-icon` a large, quiet icon above the title; `t-empty-title` says what is empty; `t-empty-text` says what to do; `t-empty-actions` the buttons that fill it
- Props: `size`: sm | md
- HTML kit: markup

Example: With an icon, a text and actions

```tsx
<EmptyState
  icon={<Icon name="bi:hdd-network" />}
  title="No hosts yet"
  text="Add a host to start watching its services."
  actions={
    <>
      <Button variant="primary" icon={<Glyph body={plus} />}>
        Add host
      </Button>
      <Button>Import a list</Button>
    </>
  }
/>
```

```html
<div class="t-empty"><span class="t-empty-icon" aria-hidden="true"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-network"></use></svg></span><p class="t-empty-title">No hosts yet</p><p class="t-empty-text">Add a host to start watching its services.</p><div class="t-empty-actions"><button type="button" class="t-btn" data-variant="primary"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-plus"></use></svg><span class="t-btn-label">Add host</span></button><button type="button" class="t-btn">Import a list</button></div></div>
```

<a id="error-page"></a>

## Error page (`error-page`)

The page for a failure: a title, one sentence, Try again and Home, and the error in a closed Details section. `routeErrorComponent` makes it a route error boundary. In the HTML kit Try again reloads the page.

- React: `import { ErrorPage } from "tailor/core";`
- Classes: `t-status-page`; parts: `t-status-page-details` the closed section that holds the error message or a reference
- Props: `title`: text or content; `text`: text or content; `homeTo`: text or content; `details`: text or content; `detailsOpen`: text or content
- HTML kit: script

Example: Default

```tsx
<ErrorPage />
```

```html
<div class="t-status-page"><div class="t-status-page-body"><span class="t-status-page-icon" aria-hidden="true"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-danger"></use></svg></span><h1 class="t-status-page-title">Something went wrong</h1><p class="t-status-page-text">The page could not load.</p><div class="t-status-page-actions"><button type="button" class="t-btn" data-variant="primary" data-t="reload"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-retry"></use></svg><span class="t-btn-label">Try again</span></button><a href="/" class="t-btn">Home</a></div></div></div>
```

<a id="facts"></a>

## Facts (`facts`)

A list of keys and values. In rows the keys form one column and a value moves under its key when space runs out; in columns each fact is a small block in a grid, and a long value wraps or ends with an ellipsis inside its column. help puts a Help after a key (React prop help; HTML: the last word of the key and the t-help button in a t-facts-key-end span inside t-facts-key); on a touch screen a row with a help button is as tall as the touch area.

- React: `import { Fact, Facts } from "tailor/core";`
- Classes: `t-facts`; parts: `t-facts-row` one fact: a key and its value; `t-facts-key` the key (dt); `t-facts-key-end` the last word of a key with its help button, kept on one line; `t-facts-value` the value (dd); data-mono sets it in the mono font
- Props: `layout`: rows | columns
- HTML kit: markup

Example: Rows

```tsx
<Facts items={host} />
```

```html
<dl class="t-facts"><div class="t-facts-row"><dt class="t-facts-key">Name</dt><dd class="t-facts-value">web-1</dd></div><div class="t-facts-row"><dt class="t-facts-key">Address</dt><dd class="t-facts-value" data-mono="">10.0.4.21</dd></div><div class="t-facts-row"><dt class="t-facts-key">State</dt><dd class="t-facts-value"><span class="t-badge" data-tone="success"><span class="t-badge-label">running</span></span></dd></div><div class="t-facts-row"><dt class="t-facts-key">Image</dt><dd class="t-facts-value" data-mono="">registry.example.com/team/web:2026.11.15-build-4821</dd></div><div class="t-facts-row"><dt class="t-facts-key">Last successful backup</dt><dd class="t-facts-value">15 November 2026, 03:00</dd></div></dl>
```

<a id="field"></a>

## Field (`field`)

Puts one control in a form with its label, an optional help text and an error text. The way to place any control in a form.

- React: `import { useFieldControl, useFieldGroup, Field } from "tailor/core";`
- Classes: `t-field`; parts: `t-field-label` the label; a click on it focuses the control; `t-field-required` the marker after the label of a required field; `t-field-control` the slot that holds the control, which stretches to the field's width; `t-field-help` the help text under the control; `t-field-error` the error text; present and empty while the field is valid
- Props: `orientation`: vertical | horizontal
- HTML kit: markup

Example: A text input with help and an error

```tsx
<Field
  label="Host name"
  help="Lower-case letters, digits and dashes."
  error="This name is already taken."
  required
>
  <Input name="host" defaultValue="web-1" />
</Field>
```

```html
<div class="t-field" data-invalid=""><label class="t-field-label" for="_R_0_" id="_R_0_-label">Host name<span class="t-field-required" aria-hidden="true">Required</span></label><div class="t-field-control"><input id="_R_0_" required="" aria-invalid="true" aria-describedby="_R_0_-help _R_0_-error" type="text" class="t-control t-input" name="host" value="web-1"/></div><p class="t-field-help" id="_R_0_-help">Lower-case letters, digits and dashes.</p><p class="t-field-error" id="_R_0_-error" aria-live="polite"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-danger"></use></svg><span>This name is already taken.</span></p></div>
```

<a id="grid"></a>

## Grid (`grid`)

Equal columns that fill the row and wrap, each at least the min width; the children in a row have equal height. With `fit`, a fixed set (a few stats or cards) stretches to fill the row instead of leaving empty columns.

- React: `import { Grid } from "tailor/core";`
- Classes: `t-grid`
- Props: `min`: 2xs | xs | sm | md; `gap`: 0 | 1 | 2 | 3 | 4 | 5 | 6; `fit`: true
- HTML kit: markup

Example: Columns of at least xs

```tsx
<Grid>
  {HOSTS.map((host, i) => (
    <Pane key={host} title={host}>
      <p>
        {i === 1 ? "Serves example.com and the mail relay, and runs the nightly backup job." : "Up."}
      </p>
    </Pane>
  ))}
</Grid>
```

```html
<div class="t-grid"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_1_-title">web-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_1_-title"><p>Up.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_2_-title">web-2</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_2_-title"><p>Serves example.com and the mail relay, and runs the nightly backup job.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_3_-title">nas</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_3_-title"><p>Up.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_4_-title">db-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_4_-title"><p>Up.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_5_-title">cache-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_5_-title"><p>Up.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_6_-title">mail</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_6_-title"><p>Up.</p></section></div></div>
```

<a id="help"></a>

## Help (`help`)

A small round info button on the text line that opens a popover with an explanation of the field or value next to it.

- React: `import { Help } from "tailor/core";`
- Classes: `t-help`
- Props: `tone`: accent | info | danger
- HTML kit: script

Example: Next to a value

```tsx
<p>
  Uptime 99.2%{" "}
  <Help label="About uptime">
    The share of the last 30 days in which web-1 answered its health check.
  </Help>
</p>
```

```html
<p>Uptime 99.2% <button type="button" class="t-help" data-tone="info" aria-label="About uptime" data-t="popover" data-t-popover="_R_3_"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></button><span class="t-popup t-popover" id="_R_3_" role="dialog" aria-label="About uptime" hidden=""><button type="button" class="t-popover-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button><span class="t-popover-body">The share of the last 30 days in which web-1 answered its health check.</span></span></p>
```

<a id="history-bars"></a>

## History bars (`history-bars`)

A row of thin equal bars, one per period, each coloured by its tone, such as the uptime of the last 30 days. A list with an accessible name; each bar says its period in visually hidden text.

- React: `import { HistoryBars } from "tailor/core";`
- Classes: `t-history`; parts: `t-history-bar` one period; its tone sets the colour
- Props: `size`: sm | md
- HTML kit: markup

Example: Uptime, last 30 days

```tsx
<HistoryBars items={month} label="Uptime of web-1, last 30 days" />
```

```html
<ol class="t-history" aria-label="Uptime of web-1, last 30 days"><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 1: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 2: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 3: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 4: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 5: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 6: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 7: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 8: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 9: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 10: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 11: up</span></li><li class="t-history-bar" data-tone="danger"><span class="t-sr-only">Day 12: down</span></li><li class="t-history-bar" data-tone="warning"><span class="t-sr-only">Day 13: slow</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 14: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 15: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 16: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 17: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 18: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 19: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 20: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 21: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 22: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 23: up</span></li><li class="t-history-bar" data-tone="warning"><span class="t-sr-only">Day 24: slow</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 25: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 26: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 27: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 28: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 29: up</span></li><li class="t-history-bar" data-tone="success"><span class="t-sr-only">Day 30: up</span></li></ol>
```

<a id="hover-card"></a>

## Hover card (`hover-card`)

A link that shows a preview of its target when the pointer rests on it or the keyboard focuses it. A touch screen gets no preview: a tap follows the link, so the preview never holds anything that the target lacks.

- React: `import { HoverCard } from "tailor/core";`
- Classes: `t-hover-card`; parts: `t-hover-card-positioner` places the card next to the link; never a bottom sheet; `t-hover-card-popup` the card surface, also a t-popup
- HTML kit: script

Example: In a sentence

```tsx
<p>
  {"The site runs on "}
  <HoverCard to="#web-1" content={web1}>
    web-1
  </HoverCard>
  {" and keeps its backups on nas."}
</p>
```

```html
<p>The site runs on <a class="t-hover-card" data-t="hover-card" href="#web-1">web-1</a><template><div class="t-stack" data-gap="2"><strong>web-1</strong><span>Serves example.com and its API. Up for 41 days.</span><div class="t-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62" aria-valuetext="62%" aria-labelledby="_R_1q_" data-size="sm" data-progressing="" style="--t-progress:62%"><span class="t-progress-label" id="_R_1q_">Disk use</span><span class="t-progress-value" aria-hidden="true">62%</span><div class="t-progress-track"><div class="t-progress-fill"></div></div></div></div></template> and keeps its backups on nas.</p>
```

<a id="icon"></a>

## Icon (`icon`)

One icon from the project's sprite. It takes the colour and the size of the text around it.

- React: `import { IconSprite, Icon } from "tailor/core";`
- Classes: `t-icon`
- Props: `set`: bi | simple-icons
- HTML kit: markup

Example: From the sprite

```tsx
<Cluster>
  <Icon name="bi:house" />
  <Icon name="bi:gear" />
  <Icon name="bi:hdd-stack" />
  <Icon name="bi:check-circle" label="Healthy" />
  <Icon name="simple-icons:github" label="GitHub" />
</Cluster>
```

```html
<div class="t-cluster"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-house"></use></svg><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-gear"></use></svg><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-stack"></use></svg><svg class="t-icon" role="img" aria-label="Healthy"><use href="/tailor/icons.svg#bi-check-circle"></use></svg><svg class="t-icon" role="img" aria-label="GitHub"><use href="/tailor/icons.svg#simple-icons-github"></use></svg></div>
```

<a id="input"></a>

## Text input (`input`)

One line of text. With a glyph, icon or short text inside the box, it becomes an input group. `pattern` sets the format the value must match; a form then checks it and shows its pattern message.

- React: `import { Input } from "tailor/core";`
- Classes: `t-input`; parts: `t-input-group` the box when the input holds something before or after the text, also a t-control; `t-input-native` the bare input inside a group; `t-input-addon` the glyph, icon or short text before or after the text; `t-input-action` a small icon button inside a group, such as clear, reveal or copy
- Props: `type`: text | email | url | tel | password; `size`: sm | md | lg; `pattern`: text or content
- HTML kit: markup

Example: With a placeholder

```tsx
<Input aria-label="Host name" name="host" placeholder="web-1" />
```

```html
<input aria-label="Host name" type="text" placeholder="web-1" class="t-control t-input" name="host"/>
```

<a id="kbd"></a>

## Keyboard key (`kbd`)

A keyboard key, or a combination of keys with a plus between them.

- React: `import { Kbd } from "tailor/core";`
- Classes: `t-kbd`; parts: `t-kbd-keys` a combination: the keys with a plus between them
- Props: `keys`: text or content
- HTML kit: markup

Example: Keys in text

```tsx
<Stack gap="2">
  <span>
    Press <Kbd>Esc</Kbd> to close the dialog.
  </span>
  <span>
    Press <Kbd keys={["Ctrl", "K"]} /> to search, or <Kbd keys={["Ctrl", "Shift", "P"]} /> for the
    commands.
  </span>
  <span>
    Move with <Kbd>↑</Kbd> and <Kbd>↓</Kbd>, pick with <Kbd>Enter</Kbd>.
  </span>
</Stack>
```

```html
<div class="t-stack" data-gap="2"><span>Press <kbd class="t-kbd">Esc</kbd> to close the dialog.</span><span>Press <kbd class="t-kbd-keys"><kbd class="t-kbd">Ctrl</kbd>+<kbd class="t-kbd">K</kbd></kbd> to search, or <kbd class="t-kbd-keys"><kbd class="t-kbd">Ctrl</kbd>+<kbd class="t-kbd">Shift</kbd>+<kbd class="t-kbd">P</kbd></kbd> for the commands.</span><span>Move with <kbd class="t-kbd">↑</kbd> and <kbd class="t-kbd">↓</kbd>, pick with <kbd class="t-kbd">Enter</kbd>.</span></div>
```

<a id="list-detail"></a>

## List and detail (`list-detail`)

A list beside a detail view. In a narrow space only one shows: the list, or the open detail with a back button.

- React: `import { ListDetail } from "tailor/core";`
- Classes: `t-list-detail`; parts: `t-list-detail-list` the list region; `t-list-detail-detail` the detail region; `t-list-detail-back` the back button, shown above the detail in a narrow space
- Props: `list`: text or content; `detail`: text or content; `detailOpen`: text or content; `listLabel`: text or content; `detailLabel`: text or content
- HTML kit: script

Example: Hosts and one host

```tsx
<Hosts />
```

```html
<div class="t-list-detail" data-t="list-detail"><section class="t-list-detail-list" aria-label="Host list"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_1_-title">Hosts</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_1_-title" data-padding="none"><ul><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">web-1</button></li><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">web-2</button></li><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">nas</button></li><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">db-1</button></li><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">cache-1</button></li><li><button type="button" class="t-btn" data-variant="ghost" data-t-detail-open="">mail</button></li></ul></section></div></section><section class="t-list-detail-detail" aria-label="Host details"><button type="button" class="t-btn t-list-detail-back" data-variant="ghost"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-arrow-left"></use></svg><span class="t-btn-label">Back</span></button><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_a_-title">web-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_a_-title"><p>web-1 serves example.com. alice manages it.</p></section></div></section></div>
```

<a id="list"></a>

## List (`list`)

Rows of items for navigation-like or record-like lists. A row with a link is a link over its whole area.

- React: `import { List, ListItem } from "tailor/core";`
- Classes: `t-list`; parts: `t-list-item` one row; aria-current marks the selected one; `t-list-leading` an icon, an avatar or a dot at the start; `t-list-content` the title and the description; `t-list-title` the title, cut to one line; `t-list-link` the link of a row, on the title; its hit area is the whole row; `t-list-description` the description, at most two lines; `t-list-trailing` a badge, a value or actions at the end; its buttons stay clickable
- Props: `dividers`: true | false
- HTML kit: markup

Example: Hosts with values

```tsx
<List label="Hosts">
  <ListItem
    leading={<Icon name="bi:hdd-stack" />}
    title="nas"
    description="12 services · 1.8 TB used of 4 TB"
    trailing={<StatusDot tone="success" label="Online" showLabel />}
  />
  <ListItem
    leading={<Icon name="bi:server" />}
    title="web-1"
    description="4 services"
    trailing={<StatusDot tone="warning" label="High load" showLabel />}
  />
  <ListItem
    leading={<Icon name="bi:pc-display" />}
    title="backup-host-in-the-second-building-with-a-very-long-name.example.com"
    description="A long description wraps to at most two lines. Nightly backups of every volume on nas and web-1, kept for thirty days, then moved to cold storage at example.com."
    trailing={<StatusDot tone="neutral" label="Offline" showLabel />}
  />
</List>
```

```html
<ul class="t-list" aria-label="Hosts"><li class="t-list-item"><span class="t-list-leading"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-stack"></use></svg></span><div class="t-list-content"><span class="t-list-title">nas</span><span class="t-list-description">12 services · 1.8 TB used of 4 TB</span></div><span class="t-list-trailing"><span class="t-dot" data-tone="success"><span class="t-dot-label">Online</span></span></span></li><li class="t-list-item"><span class="t-list-leading"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-server"></use></svg></span><div class="t-list-content"><span class="t-list-title">web-1</span><span class="t-list-description">4 services</span></div><span class="t-list-trailing"><span class="t-dot" data-tone="warning"><span class="t-dot-label">High load</span></span></span></li><li class="t-list-item"><span class="t-list-leading"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-pc-display"></use></svg></span><div class="t-list-content"><span class="t-list-title">backup-host-in-the-second-building-with-a-very-long-name.example.com</span><span class="t-list-description">A long description wraps to at most two lines. Nightly backups of every volume on nas and web-1, kept for thirty days, then moved to cold storage at example.com.</span></div><span class="t-list-trailing"><span class="t-dot" data-tone="neutral"><span class="t-dot-label">Offline</span></span></span></li></ul>
```

<a id="loading-page"></a>

## Loading page (`loading-page`)

The pending state of a page: a centred spinner with a text, or the skeleton of a page. It shows only after a short delay, so a fast load never flashes. `routePendingComponent` wires it into a router.

- React: `import { LoadingPage } from "tailor/core";`
- Classes: `t-loading-page`; parts: `t-loading-page-spinner` the spinner and its text; `t-loading-page-label` the visible text under the spinner, the page's h1; `t-loading-page-skeleton` the placeholder of a page: a title, a toolbar and rows
- Props: `variant`: spinner | skeleton; `delay`: 0 | 150 | 500 | 1000
- HTML kit: markup

Example: Spinner

```tsx
<LoadingPage />
```

```html
<div class="t-status-page t-loading-page" role="status" aria-busy="true"><div class="t-loading-page-spinner"><span class="t-spinner" data-size="lg" aria-hidden="true"></span><h1 class="t-loading-page-label">Loading</h1></div></div>
```

<a id="media-fit"></a>

## Media fit (`media-fit`)

Shows one image, video, canvas or SVG at the largest size that fits the free width and height of its box, with its aspect ratio kept, centred; it never grows a pane, a card or the page. fit="down" (default) never draws it above its natural size; fit="contain" also scales a small one up. Put it as the body of a Pane, a Split pane or a fill Page; in a box with no fixed height it fits the width only, and in the stacked Split of a fill Page on a phone it also stays within 70 % of the screen height. The empty slot shows while it holds no media, and hides by itself when an <img>, <video>, <canvas>, <svg> or <picture> is put into it.

- React: `import { MediaFit } from "tailor/core";`
- Classes: `t-media-fit`; parts: `t-media-fit-empty` what shows while there is no media, usually an EmptyState; hidden once media is in the box
- Props: `fit`: down | contain; `empty`: text or content; `children`: text or content
- HTML kit: markup

Example: A large picture in a pane: it fits the free width and height

```tsx
<Pane title="Preview">
  <MediaFit>
    <img src={LARGE} width={1200} height={900} alt="Drawing of 1200 × 900 pixels" />
  </MediaFit>
</Pane>
```

```html
<div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_0_-title">Preview</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_0_-title"><div class="t-media-fit"><img src="data:…" width="1200" height="900" alt="Drawing of 1200 × 900 pixels"/></div></section></div>
```

<a id="menu"></a>

## Menu (`menu`)

A list of actions that opens from a button: items, links, checkbox items, radio groups, groups and separators. Arrow keys, Home, End and typing move; Escape closes. On a phone it opens as a bottom sheet. Submenus are not supported: use a group or a dialog.

- React: `import { Menu } from "tailor/core";`
- Classes: `t-menu`; parts: `t-menu-item` one entry, also a t-option (role menuitem, menuitemcheckbox or menuitemradio); `t-menu-icon` the icon of an item; `t-menu-check` the tick of a checkbox or radio item, also a t-menu-icon; `t-menu-label` the text of an item; `t-menu-shortcut` the keyboard shortcut that an item shows; `t-menu-separator` a line between items; `t-menu-group` items that belong together, under a label; `t-menu-group-label` the label of a group
- Props: `align`: start | center | end; `side`: bottom | end; `tone`: danger
- HTML kit: script

Example: Actions with icons, a link, a disabled and a danger item

```tsx
<Menu
  trigger={<Button icon={<Glyph body={chevronDown} />}>Actions</Button>}
  label="Service actions"
  items={actions}
/>
```

```html
<button type="button" class="t-btn" data-t="menu" data-t-menu="_R_0_" aria-haspopup="menu" aria-expanded="false"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-down"></use></svg><span class="t-btn-label">Actions</span></button><div class="t-popup t-menu" id="_R_0_" role="menu" aria-label="Service actions" hidden=""><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="restart"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-retry"></use></svg></span><span class="t-menu-label">Restart</span><span class="t-menu-shortcut">Ctrl+R</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="copy"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-copy"></use></svg></span><span class="t-menu-label">Copy address</span></button><a href="https://example.com/docs" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="docs"><span class="t-menu-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-external"></use></svg></span><span class="t-menu-label">Open docs</span></a><div class="t-menu-separator" role="separator" aria-orientation="horizontal"></div><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="stop" aria-disabled="true"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-stop-circle"></use></svg></span><span class="t-menu-label">Stop</span></button><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="delete" data-tone="danger"><span class="t-menu-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-trash"></use></svg></span><span class="t-menu-label">Delete service</span></button></div>
```

<a id="mini-bars"></a>

## Mini bar chart (`mini-bars`)

A small bar chart from a few values, such as the load per core, as wide as its container. One image with an accessible name. Each bar's height is the custom property --t-value.

- React: `import { MiniBars } from "tailor/core";`
- Classes: `t-minibars`; parts: `t-minibars-bar` one bar, as high as --t-value
- Props: `tone`: neutral | accent | success | warning | danger | info; `size`: sm | md
- HTML kit: markup

Example: Load per core

```tsx
<MiniBars values={cores} max={100} label="Load per core of web-1, in percent" />
```

```html
<div class="t-minibars" role="img" aria-label="Load per core of web-1, in percent"><span class="t-minibars-bar" style="--t-value:62%"></span><span class="t-minibars-bar" style="--t-value:48%"></span><span class="t-minibars-bar" style="--t-value:91%"></span><span class="t-minibars-bar" style="--t-value:30%"></span><span class="t-minibars-bar" style="--t-value:75%"></span><span class="t-minibars-bar" style="--t-value:55%"></span><span class="t-minibars-bar" style="--t-value:12%"></span><span class="t-minibars-bar" style="--t-value:68%"></span></div>
```

<a id="multi-select"></a>

## Multi-select (`multi-select`)

Picks several values from a known set by typing to filter; the values show as chips in the box. On a phone the list opens as a bottom sheet.

- React: `import { MultiSelect } from "tailor/core";`
- Classes: `t-multi-select`; parts: `t-multi-select-chips` the row of chips and the text input; it wraps, and the box grows with it; `t-chip` one picked value, with its remove button; `t-multi-select-input` the text input that filters the list; `t-multi-select-trigger` the chevron that opens the list; also a t-input-action; `t-multi-select-popup` the list surface, also a t-popup; it stays open while picking; `t-option` one choice; a check marks the picked ones; `t-multi-select-description` a line under the label of a choice; `t-multi-select-empty` the line shown when no choice matches; `t-multi-select-status` the line shown while the choices load
- Props: `size`: sm | md | lg
- HTML kit: script

Example: With a placeholder

```tsx
<MultiSelect options={hosts} name="hosts" aria-label="Hosts" placeholder="Pick hosts" />
```

```html
<select name="hosts" aria-label="Hosts" multiple="" class="t-control" data-t="multi-select" data-placeholder="Pick hosts"><option value="web-1">web-1</option><option value="web-2">web-2</option><option value="nas">nas</option><option value="console" disabled="">console</option></select>
```

<a id="nav-drawer"></a>

## Navigation drawer (`nav-drawer`)

The navigation of a shell on a phone: a drawer from the start edge with the brand, every link (sub-items indented), the global actions, the footer facts and the theme controls. A menu button opens it; a link, Escape, the backdrop or a swipe toward the start edge closes it. Without the script the menu button is a link to the drawer.

- React: `import { useNavDrawer, NavDrawer } from "tailor/core";`
- Classes: `t-nav-drawer`; parts: `t-nav-drawer-body` the links and the actions; it scrolls when it is long; `t-nav-drawer-footer` the footer facts and the theme controls, at the bottom
- Props: `theme`: skin | palette | mode; `button`: text or content
- HTML kit: script

Example: Groups, footer facts and the theme controls

```tsx
<Phone brand={BRAND} nav={GROUPS} footer={FOOTER} theme={["palette", "mode"]} />
```

```html
<div class="t-shell" data-shell="bare" data-t="shell"><a class="t-shell-skip" href="#_R_0_">Skip to content</a><header class="t-shell-bar"><a class="t-btn t-shell-menu-button" data-variant="ghost" data-icon-only="" href="#_R_1d_" data-t-open="_R_1d_" aria-label="Menu" aria-controls="_R_1d_" aria-expanded="false"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-menu"></use></svg></a><dialog class="t-drawer t-nav-drawer" id="_R_1d_" data-t="dialog nav-drawer" data-side="start" aria-label="Menu"><header class="t-drawer-header"><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span><span class="t-shell-brand-name">Console</span></a><button type="button" class="t-drawer-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-drawer-body t-nav-drawer-body"><nav class="t-shell-nav" aria-label="Main navigation"><div class="t-shell-group"><div class="t-shell-group-label">Run</div><ul class="t-shell-list" aria-label="Run"><li><a href="#overview" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-speedometer2"></use></svg></span><span class="t-shell-label">Overview</span></a></li><li><a href="#services" aria-current="page" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-stack"></use></svg></span><span class="t-shell-label">Services</span><span class="t-counter" data-tone="neutral">3</span></a></li><li><a href="#hosts" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-pc-display"></use></svg></span><span class="t-shell-label">Hosts</span></a></li><li><a href="#deploys" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-rocket-takeoff"></use></svg></span><span class="t-shell-label">Deploys</span></a></li></ul></div><div class="t-shell-group"><div class="t-shell-group-label">Admin</div><ul class="t-shell-list" aria-label="Admin"><li><span class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-sliders"></use></svg></span><span class="t-shell-label">System</span></span><ul class="t-shell-sub"><li><a href="#jobs" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-clock-history"></use></svg></span><span class="t-shell-label">Jobs</span></a></li><li><a href="#backups" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-archive"></use></svg></span><span class="t-shell-label">Backups</span></a></li><li><a href="#logs" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-journal-text"></use></svg></span><span class="t-shell-label">Logs</span></a></li></ul></li><li><a href="#settings" class="t-shell-link"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-gear"></use></svg></span><span class="t-shell-label">Settings</span></a></li></ul></div></nav></div><div class="t-nav-drawer-footer"><ul class="t-shell-facts"><li class="t-shell-fact">Version 2.4.1</li><li class="t-shell-fact"><a href="https://example.com/docs">Docs</a></li></ul><div class="t-shell-theme"><div class="t-theme-pickers" data-t="theme-pickers" data-parts="palette mode" data-layout="compact"></div></div></div></dialog><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span>
<!-- … cut here; the whole markup: reference/core/nav-drawer.html -->
```

<a id="not-found"></a>

## Not found page (`not-found`)

The page for an address that matches nothing: a title, one sentence and a link home. It fills its parent and centres its content. `routeNotFoundComponent` wires it into a router.

- React: `import { NotFoundPage } from "tailor/core";`
- Classes: `t-status-page`; parts: `t-status-page-body` the centred column; `t-status-page-code` a large, quiet code such as 404, for looks only; `t-status-page-icon` a large, quiet glyph above the title; `t-status-page-title` the one h1 of the page; `t-status-page-text` one sentence under the title; `t-status-page-actions` the buttons and links
- Props: `title`: text or content; `text`: text or content; `homeTo`: text or content
- HTML kit: markup

Example: Default

```tsx
<NotFoundPage />
```

```html
<div class="t-status-page"><div class="t-status-page-body"><p class="t-status-page-code" aria-hidden="true">404</p><h1 class="t-status-page-title">Page not found</h1><p class="t-status-page-text">The address does not match a page.</p><div class="t-status-page-actions"><a href="/" class="t-btn" data-variant="primary">Home</a></div></div></div>
```

<a id="number"></a>

## Number field (`number`)

A number with drawn step buttons. The buttons repeat while held; the arrow keys step; the value stays between min and max.

- React: `import { NumberField } from "tailor/core";`
- Classes: `t-number`; parts: `t-number-input` the text of the number; `t-number-step` the decrease or increase button; `t-number-unit` an optional short suffix such as ms
- Props: `size`: sm | md | lg
- HTML kit: script

Example: Between a min and a max

```tsx
<NumberField aria-label="Replicas" name="replicas" defaultValue={3} min={1} max={5} />
```

```html
<input aria-label="Replicas" type="number" class="t-control t-input" data-t="number" min="1" max="5" step="1" name="replicas" value="3"/>
```

<a id="offline-page"></a>

## Offline page (`offline-page`)

The page for no network connection: a glyph, a title, one sentence and Try again, which reloads. It loads nothing: no sprite icon, no image.

- React: `import { OfflinePage } from "tailor/core";`
- Classes: `t-status-page`
- Props: `title`: text or content; `text`: text or content
- HTML kit: script

Example: Default

```tsx
<OfflinePage />
```

```html
<div class="t-status-page"><div class="t-status-page-body"><span class="t-status-page-icon" aria-hidden="true"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="…"/></svg></span><h1 class="t-status-page-title">No connection</h1><p class="t-status-page-text">The page needs a network connection.</p><div class="t-status-page-actions"><button type="button" class="t-btn" data-variant="primary" data-t="reload"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><g fill="currentColor"><path fill-rule="evenodd" d="…"/><path d="…"/></g></svg><span class="t-btn-label">Try again</span></button></div></div></div>
```

<a id="page"></a>

## Page (`page`)

Fills the content region of a shell: a pinned header with the one h1 (and the state of the record beside it), and a body that scrolls or fills. width="readable" caps the header and the body at a width that reads well.

- React: `import { Page } from "tailor/core";`
- Classes: `t-page`; parts: `t-page-header` the title row, pinned at the top; `t-page-breadcrumb` holds the breadcrumb, above the title; `t-page-heading` holds the title and the description; `t-page-title` the one h1 of the page; `t-page-title-row` the title with the status beside it, when the page has a status; `t-page-status` the state of the record beside the title, usually a StateLabel; `t-page-description` one line under the title; `t-page-actions` the page actions, at the end; under the title in a narrow page; `t-page-secondary` the other actions as buttons, in a page of at least 40rem; `t-page-more` the other actions as one menu, in a narrower page; `t-page-body` the content: scrolls (mode scroll) or takes the free height (mode fill)
- Props: `title`: text or content; `status`: text or content; `description`: text or content; `breadcrumb`: text or content; `actions`: text or content; `primaryAction`: text or content; `moreActions`: text or content; `mode`: scroll | fill; `width`: full | readable
- HTML kit: markup

Example: Scroll: the header stays, the body scrolls

```tsx
<Page
  title="Hosts"
  description="Every machine that runs a service."
  actions={
    <>
      <Button>Export</Button>
      <Button variant="primary">Add host</Button>
    </>
  }
>
  <Section title="Web" description="Hosts that serve example.com.">
    <Grid>{hostPanes.slice(0, 4)}</Grid>
  </Section>
  <Section title="Storage" actions={<Button size="sm">Add disk</Button>}>
    <Grid>{hostPanes.slice(4)}</Grid>
  </Section>
</Page>
```

```html
<div class="t-page"><header class="t-page-header"><div class="t-page-heading"><h1 class="t-page-title" id="_R_0_">Hosts</h1><p class="t-page-description">Every machine that runs a service.</p></div><div class="t-page-actions"><button type="button" class="t-btn">Export</button><button type="button" class="t-btn" data-variant="primary">Add host</button></div></header><section class="t-page-body" tabindex="0" aria-labelledby="_R_0_"><section class="t-section"><header class="t-section-header"><div class="t-section-heading"><h2 class="t-section-title">Web</h2><p class="t-section-description">Hosts that serve example.com.</p></div></header><div class="t-section-body"><div class="t-grid"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_6d_-title">web-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_6d_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_ad_-title">web-2</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_ad_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_ed_-title">nas</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_ed_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_id_-title">db-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_id_-title"><p>Serves example.com. Last check passed.</p></section></div></div></div></section><section class="t-section"><header class="t-section-header"><div class="t-section-heading"><h2 class="t-section-title">Storage</h2></div><div class="t-section-actions"><button type="button" class="t-btn" data-size="sm">Add disk</button></div></header><div class="t-section-body"><div class="t-grid"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_6l_-title">db-2</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_6l_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_al_-title">cache-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_al_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_el_-title">mail</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_el_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_il_-title">backup</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_il_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_ml_-title">proxy</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_ml_-title"><p>Serves example.com. Last check passed.</p></section></div><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_ql_-title">build</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_ql_-title"><p>Serves example.com. Last check passed.</p></section></div></div></div></section></section></div>
```

<a id="pagination"></a>

## Pagination (`pagination`)

Moves through the pages of a list: previous, next and the page numbers around the current one. In a narrow container only previous, "Page N of M" and next show.

- React: `import { Pagination } from "tailor/core";`
- Classes: `t-pagination`; parts: `t-pagination-list` the row of items; `t-pagination-step` the previous or the next button or link; `t-pagination-page` one page number; the current one has aria-current="page"; `t-pagination-gap` the ellipsis that stands for hidden pages; `t-pagination-status` the "Page N of M" text of the narrow form
- HTML kit: markup

Example: Buttons

```tsx
<Pages start={5} pageCount={12} label="Hosts pages" />
```

```html
<nav class="t-pagination" aria-label="Hosts pages"><ul class="t-pagination-list"><li><a href="?page=4" class="t-pagination-step" rel="prev"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-left"></use></svg>Previous</a></li><li><a href="?page=1" class="t-pagination-page" aria-label="Page 1">1</a></li><li class="t-pagination-gap" aria-hidden="true">…</li><li><a href="?page=4" class="t-pagination-page" aria-label="Page 4">4</a></li><li><a href="?page=5" aria-current="page" class="t-pagination-page" aria-label="Page 5">5</a></li><li><a href="?page=6" class="t-pagination-page" aria-label="Page 6">6</a></li><li class="t-pagination-gap" aria-hidden="true">…</li><li><a href="?page=12" class="t-pagination-page" aria-label="Page 12">12</a></li><li class="t-pagination-status">Page 5 of 12</li><li><a href="?page=6" class="t-pagination-step" rel="next">Next<svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-chevron-right"></use></svg></a></li></ul></nav>
```

<a id="pane"></a>

## Pane (`pane`)

A box with a fixed header and a body that scrolls. It fills the height of its parent: use it in a fill page, a split or a list-detail.

- React: `import { Pane } from "tailor/core";`
- Classes: `t-pane`; parts: `t-pane-header` the title row; `t-pane-title` the title; `t-pane-actions` the pane actions, at the end; `t-pane-body` the content: a named region in the tab order, which scrolls; data-padding=none for tables and lists; `t-pane-footer` an optional row at the bottom
- Props: `title`: text or content; `actions`: text or content; `footer`: text or content; `label`: text or content; `padding`: default | none
- HTML kit: markup

Example: Title, actions and footer

```tsx
<Pane
  title="web-1"
  actions={<Button size="sm">Restart</Button>}
  footer={
    <>
      <Button>Cancel</Button>
      <Button variant="primary">Save</Button>
    </>
  }
>
  <p>Serves example.com. The body scrolls when the pane has less height than its content.</p>
</Pane>
```

```html
<div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_0_-title">web-1</h2><div class="t-pane-actions"><button type="button" class="t-btn" data-size="sm">Restart</button></div></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_0_-title"><p>Serves example.com. The body scrolls when the pane has less height than its content.</p></section><footer class="t-pane-footer"><button type="button" class="t-btn">Cancel</button><button type="button" class="t-btn" data-variant="primary">Save</button></footer></div>
```

<a id="popover"></a>

## Popover (`popover`)

A small panel anchored to its trigger, for content and controls. On a phone it is a bottom sheet. HTML: <button data-t="popover" data-t-popover="ID"> and <div class="t-popup t-popover" id="ID" hidden>.

- React: `import { Popover } from "tailor/core";`
- Classes: `t-popover`; parts: `t-popover-title` the title, optional; `t-popover-body` the content; `t-popover-close` the close button, shown in the sheet form
- Props: `side`: top | bottom | left | right; `align`: start | center | end
- HTML kit: script

Example: With a title and controls

```tsx
<Popover trigger={<Button>Share</Button>} title="Share web-1">
  <Stack>
    <p>alice and the team of nas can see this host.</p>
    <Cluster gap="2">
      <Button size="sm" variant="primary">
        Copy link
      </Button>
      <Button size="sm">Invite</Button>
    </Cluster>
  </Stack>
</Popover>
```

```html
<button type="button" class="t-btn" data-t="popover" data-t-popover="_R_0_">Share</button><div class="t-popup t-popover" id="_R_0_" role="dialog" aria-labelledby="_R_0_-title" hidden=""><h2 class="t-popover-title" id="_R_0_-title">Share web-1</h2><button type="button" class="t-popover-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button><div class="t-popover-body"><div class="t-stack"><p>alice and the team of nas can see this host.</p><div class="t-cluster" data-gap="2"><button type="button" class="t-btn" data-variant="primary" data-size="sm">Copy link</button><button type="button" class="t-btn" data-size="sm">Invite</button></div></div></div></div>
```

<a id="progress"></a>

## Progress bar (`progress`)

Shows how far a task of known length has got, such as an upload. With no value it shows activity of unknown length. The fill width is the one custom property --t-progress on the root.

- React: `import { Progress } from "tailor/core";`
- Classes: `t-progress`; parts: `t-progress-label` the visible name, when it is shown; `t-progress-value` the value as a percentage, when the label is shown; `t-progress-track` the groove; `t-progress-fill` the filled part, as wide as --t-progress
- Props: `tone`: neutral | accent | success | warning | danger | info; `size`: sm | md
- HTML kit: markup

Example: With a visible label

```tsx
<Stack>
  <Progress value={62} label="Uploading backup.tar" showLabel />
  <Progress value={0} label="Waiting to start" showLabel />
  <Progress value={100} label="Copied to nas" showLabel tone="success" />
</Stack>
```

```html
<div class="t-stack"><div class="t-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="62" aria-valuetext="62%" aria-labelledby="_R_1_" data-progressing="" style="--t-progress:62%"><span class="t-progress-label" id="_R_1_">Uploading backup.tar</span><span class="t-progress-value" aria-hidden="true">62%</span><div class="t-progress-track"><div class="t-progress-fill"></div></div></div><div class="t-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0%" aria-labelledby="_R_2_" data-progressing="" style="--t-progress:0%"><span class="t-progress-label" id="_R_2_">Waiting to start</span><span class="t-progress-value" aria-hidden="true">0%</span><div class="t-progress-track"><div class="t-progress-fill"></div></div></div><div class="t-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" aria-valuetext="100%" aria-labelledby="_R_3_" data-tone="success" data-complete="" style="--t-progress:100%"><span class="t-progress-label" id="_R_3_">Copied to nas</span><span class="t-progress-value" aria-hidden="true">100%</span><div class="t-progress-track"><div class="t-progress-fill"></div></div></div></div>
```

<a id="prose"></a>

## Prose (`prose`)

Styles long text that comes as plain HTML, such as rendered Markdown: headings, lists, quotes, code, tables and images.

- React: `import { Prose } from "tailor/core";`
- Classes: `t-prose`
- HTML kit: markup

Example: Rendered Markdown

```tsx
<Prose>
  <h1>Moving a service to another host</h1>
  <p>
    A service runs on one host at a time. To move <code>web-1</code> from <code>nas</code> to a new
    host, stop it, copy its volumes, and start it on the new host. The steps below take about ten
    minutes. See <a href="https://example.com/docs/hosts">the host guide</a> for the details of each
    host.
  </p>
  <h2>Before you start</h2>
  <ul>
    <li>The new host is online and has enough disk space.</li>
    <li>
      You have a recent backup:
      <ul>
        <li>the volumes of the service,</li>
        <li>its settings file.</li>
      </ul>
    </li>
  </ul>
  <h2>Steps</h2>
  <ol>
    <li>Stop the service.</li>
    <li>
      Copy the volumes with <code>rsync</code>.
    </li>
    <li>Start the service on the new host and check its health.</li>
  </ol>
  <pre>
    <code>
      {
        "rsync -a --info=progress2 /srv/web-1/ new-host:/srv/web-1/\nssh new-host 'docker compose -f /srv/web-1/compose.yaml up -d'"
      }
    </code>
  </pre>
  <blockquote>
    <p>
      Keep the old copy for a week. A move that looks fine can still miss a file that only a monthly job
      uses.
    </p>
  </blockquote>
  <p>
    <img
      src={diagram}
      alt="The service moves from nas, on the left, to the new host, on the right."
      width={480}
      height={160}
    />
  </p>
  <h3>Sizes of the volumes</h3>
  <table>
    <thead>
      <tr>
        <th>Volume</th>
        <th>Size</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>site</td>
        <td>120 MB</td>
        <td>Static files</td>
      </tr>
      <tr>
        <td>logs</td>
        <td>2.4 GB</td>
        <td>Can be left behind</td>
      </tr>
    </tbody>
  </table>
  <hr />
  <h4>After the move</h4>
  <p>
    Change the address in the settings of every service that calls <strong>web-1</strong>.
  </p>
</Prose>
```

```html
<div class="t-prose"><h1>Moving a service to another host</h1><p>A service runs on one host at a time. To move <code>web-1</code> from <code>nas</code> to a new host, stop it, copy its volumes, and start it on the new host. The steps below take about ten minutes. See <a href="https://example.com/docs/hosts">the host guide</a> for the details of each host.</p><h2>Before you start</h2><ul><li>The new host is online and has enough disk space.</li><li>You have a recent backup:<ul><li>the volumes of the service,</li><li>its settings file.</li></ul></li></ul><h2>Steps</h2><ol><li>Stop the service.</li><li>Copy the volumes with <code>rsync</code>.</li><li>Start the service on the new host and check its health.</li></ol><pre><code>rsync -a --info=progress2 /srv/web-1/ new-host:/srv/web-1/
ssh new-host &#x27;docker compose -f /srv/web-1/compose.yaml up -d&#x27;</code></pre><blockquote><p>Keep the old copy for a week. A move that looks fine can still miss a file that only a monthly job uses.</p></blockquote><p><img src="data:…" alt="The service moves from nas, on the left, to the new host, on the right." width="480" height="160"/></p><h3>Sizes of the volumes</h3><table><thead><tr><th>Volume</th><th>Size</th><th>Note</th></tr></thead><tbody><tr><td>site</td><td>120 MB</td><td>Static files</td></tr><tr><td>logs</td><td>2.4 GB</td><td>Can be left behind</td></tr></tbody></table><hr/><h4>After the move</h4><p>Change the address in the settings of every service that calls <strong>web-1</strong>.</p></div>
```

<a id="radio"></a>

## Radio group (`radio`)

One choice from a few options that are all visible, each with room for a description. For many options use a select.

- React: `import { RadioGroup } from "tailor/core";`
- Classes: `t-radio`; parts: `t-radio-group` the fieldset that holds the options; `t-radio-group-label` the legend of the group; `t-radio-input` the drawn circle: a native radio in the HTML kit, the Base UI radio in React; `t-radio-label` the label text of one option; the whole t-radio is the hit area; `t-radio-description` an optional line under the label of one option
- Props: `orientation`: vertical | horizontal
- HTML kit: markup

Example: With descriptions

```tsx
<RadioGroup label="Plan" name="plan" options={plans} defaultValue="medium" />
```

```html
<fieldset class="t-radio-group" aria-labelledby="_R_0_-legend" role="radiogroup"><legend class="t-radio-group-label" id="_R_0_-legend">Plan</legend><label class="t-radio"><input class="t-radio-input" aria-labelledby="_R_0_-0" aria-describedby="_R_0_-0-description" type="radio" name="plan" value="small"/><span class="t-radio-label" id="_R_0_-0">Small</span><span class="t-radio-description" id="_R_0_-0-description">1 CPU, 1 GB memory.</span></label><label class="t-radio"><input class="t-radio-input" aria-labelledby="_R_0_-1" aria-describedby="_R_0_-1-description" type="radio" name="plan" checked="" value="medium"/><span class="t-radio-label" id="_R_0_-1">Medium</span><span class="t-radio-description" id="_R_0_-1-description">2 CPUs, 4 GB memory.</span></label><label class="t-radio"><input class="t-radio-input" aria-labelledby="_R_0_-2" aria-describedby="_R_0_-2-description" type="radio" name="plan" value="large"/><span class="t-radio-label" id="_R_0_-2">Large</span><span class="t-radio-description" id="_R_0_-2-description">8 CPUs, 32 GB memory.</span></label><label class="t-radio"><input class="t-radio-input" disabled="" aria-labelledby="_R_0_-3" aria-describedby="_R_0_-3-description" type="radio" name="plan" value="custom"/><span class="t-radio-label" id="_R_0_-3">Custom</span><span class="t-radio-description" id="_R_0_-3-description">Ask alice.</span></label></fieldset>
```

<a id="relative-time"></a>

## Relative time (`relative-time`)

A point in time as "2 hours ago" or "in 3 days", kept up to date while the page is open. The full date is its description (title): the browser shows it on hover and a screen reader reads it after the text. No aria-label: the role "time" takes no name.

- React: `import { RelativeTime } from "tailor/core";`
- Classes: `t-time`
- Props: `date`: text or content; `locale`: text or content
- HTML kit: script

Example: Past and future

```tsx
<Stack gap="1">
  <span>
    Deployed <RelativeTime date={"2026-11-15T10:00:00Z"} />
  </span>
  <span>
    Backup ran <RelativeTime date={"2026-11-12T12:00:00Z"} />
  </span>
  <span>
    Certificate renews <RelativeTime date={"2026-11-18T12:05:00Z"} />
  </span>
  <span>
    Updated <RelativeTime date={"2026-11-15T11:59:40Z"} />
  </span>
</Stack>
```

```html
<div class="t-stack" data-gap="1"><span>Deployed <time class="t-time" dateTime="2026-11-15T10:00:00.000Z" title="November 15, 2026 at 11:00 AM" data-t="relative-time">1 week ago</time></span><span>Backup ran <time class="t-time" dateTime="2026-11-12T12:00:00.000Z" title="November 12, 2026 at 1:00 PM" data-t="relative-time">1 week ago</time></span><span>Certificate renews <time class="t-time" dateTime="2026-11-18T12:05:00.000Z" title="November 18, 2026 at 1:05 PM" data-t="relative-time">6 days ago</time></span><span>Updated <time class="t-time" dateTime="2026-11-15T11:59:40.000Z" title="November 15, 2026 at 12:59 PM" data-t="relative-time">1 week ago</time></span></div>
```

<a id="search"></a>

## Search field (`search`)

A search field with a clear button. The / key focuses it; Escape clears it, or leaves it when empty. Debounce the value in the caller.

- React: `import { Search } from "tailor/core";`
- Classes: `t-search`; parts: `t-search-icon` the search glyph, also a t-input-addon; `t-search-clear` the clear button, shown while there is text; also a t-input-action; `t-search-key` the / hint, shown while the field is empty and not focused
- Props: `size`: sm | md | lg
- HTML kit: script

Example: With the / shortcut

```tsx
<Search label="Search hosts" name="q" />
```

```html
<div class="t-control t-input-group t-search" data-t="search"><span class="t-input-addon t-search-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></span><input type="search" class="t-input-native" placeholder="Search" aria-label="Search hosts" autoComplete="off" name="q" value=""/></div>
```

<a id="secret"></a>

## Secret field (`secret`)

A secret value such as a password or a token, hidden until the reveal button shows it, with an optional copy button.

- React: `import { Secret } from "tailor/core";`
- Classes: `t-secret`; parts: `t-secret-reveal` the toggle that shows or hides the value, also a t-input-action; `t-secret-copy` the button that copies the value, also a t-input-action
- Props: `size`: sm | md | lg
- HTML kit: script

Example: With reveal and copy

```tsx
<Secret aria-label="API token" name="token" defaultValue="tok_4f2a9c81e7d3" copyable />
```

```html
<div class="t-control t-input-group t-secret" data-t="secret" data-copyable=""><input aria-label="API token" class="t-input-native" autoComplete="off" spellCheck="false" type="password" name="token" value="tok_4f2a9c81e7d3"/></div>
```

<a id="section"></a>

## Section (`section`)

A titled block inside a page, with optional actions at the end of its header.

- React: `import { Section } from "tailor/core";`
- Classes: `t-section`; parts: `t-section-header` the title row; `t-section-heading` holds the title and the description; `t-section-title` the h2; `t-section-description` one line under the title; `t-section-actions` the section actions, at the end; `t-section-body` the content, a column
- Props: `title`: text or content; `description`: text or content; `actions`: text or content
- HTML kit: markup

Example: Title, description and actions

```tsx
<Section
  title="Services"
  description="What web-1 runs."
  actions={
    <>
      <Button size="sm">Restart all</Button>
      <Button size="sm" variant="primary">
        Add service
      </Button>
    </>
  }
>
  <p>Three services run on web-1: the site for example.com, the mail relay and the backup agent.</p>
  <p>Each service restarts on its own when it stops.</p>
</Section>
```

```html
<section class="t-section"><header class="t-section-header"><div class="t-section-heading"><h2 class="t-section-title">Services</h2><p class="t-section-description">What web-1 runs.</p></div><div class="t-section-actions"><button type="button" class="t-btn" data-size="sm">Restart all</button><button type="button" class="t-btn" data-variant="primary" data-size="sm">Add service</button></div></header><div class="t-section-body"><p>Three services run on web-1: the site for example.com, the mail relay and the backup agent.</p><p>Each service restarts on its own when it stops.</p></div></section>
```

<a id="segmented"></a>

## Segmented control (`segmented`)

Picks one of two to five short options that stay visible, such as a view switch or a filter state. Arrow keys move the choice. For more or longer options, use a select.

- React: `import { Segmented } from "tailor/core";`
- Classes: `t-segmented`; parts: `t-segmented-option` one choice; the chosen one looks raised; `t-segmented-input` the native radio inside an option (HTML kit), visually hidden; `t-segmented-icon` the icon of an option; `t-segmented-label` the text of an option
- Props: `size`: sm | md | lg
- HTML kit: markup

Example: A view switch

```tsx
<Segmented label="View" name="view" options={views} />
```

```html
<div class="t-segmented" role="radiogroup" aria-label="View"><label class="t-segmented-option"><input type="radio" class="t-segmented-input" name="view" checked="" value="list"/><span class="t-segmented-label">List</span></label><label class="t-segmented-option"><input type="radio" class="t-segmented-input" name="view" value="grid"/><span class="t-segmented-label">Grid</span></label><label class="t-segmented-option"><input type="radio" class="t-segmented-input" name="view" value="map"/><span class="t-segmented-label">Map</span></label></div>
```

<a id="select"></a>

## Select (`select`)

Picks one value from a known set. The list is drawn by tailor; on a phone it opens as a bottom sheet.

- React: `import { Select } from "tailor/core";`
- Classes: `t-select`; parts: `t-select-trigger` the button that shows the value and opens the list; `t-select-value` the value text, or the placeholder; `t-select-icon` the chevron; `t-select-popup` the list surface, also a t-popup; `t-option` one choice
- Props: `size`: sm | md | lg
- HTML kit: script

Example: With a placeholder

```tsx
<Select options={hosts} name="host" aria-label="Host" placeholder="Pick a host" />
```

```html
<select class="t-control t-select" data-t="select" data-placeholder="Pick a host" name="host" aria-label="Host"><option value="" hidden="" selected="">Pick a host</option><option value="web-1">web-1</option><option value="web-2">web-2</option><option value="nas">nas</option><option value="console" disabled="">console</option></select>
```

<a id="separator"></a>

## Separator (`separator`)

A line between groups, across or upright, with an optional label in the middle. A decorative line is hidden from screen readers.

- React: `import { Separator } from "tailor/core";`
- Classes: `t-separator`; parts: `t-separator-label` the text in the middle of an across line
- Props: `orientation`: horizontal | vertical; `decorative`: true
- HTML kit: markup

Example: Across

```tsx
<Stack>
  <span>Hosts: nas, web-1</span>
  <Separator />
  <span>Users: alice</span>
</Stack>
```

```html
<div class="t-stack"><span>Hosts: nas, web-1</span><div class="t-separator" role="separator"></div><span>Users: alice</span></div>
```

<a id="shell-base"></a>

## Shell parts (`shell-base`)

What every shell shares: the frame bound to the visible screen, the skip link, the brand, the navigation links, the footer facts and the theme controls. Apps pick a shell (topnav, sidenav, bare); these parts are for shells.

- React: `import { useCurrentPath, ShellRoot, ShellMain, ShellBar, useShellForm, useNarrowStart, useShellSearch, ShellSearch, ShellSearchButton, ShellActions, ShellFooter, ShellBrandLink, NavIcon, NavContent, NavLink, NavLists, FooterFacts, ShellTheme } from "tailor/core";`
- Classes: `t-shell`; parts: `t-shell-skip` the skip link, the first focusable element; visible only while it has the focus; `t-shell-bar` a top bar (header); `t-shell-brand` the brand: a link home with the mark and the name; `t-shell-brand-mark` the icon or logo of the brand; `t-shell-brand-name` the name of the brand; it truncates; `t-shell-nav` a navigation region (nav with aria-label); `t-shell-group` a group of links with its label; `t-shell-group-label` the label of a group; `t-shell-list` the list of links of a group; `t-shell-sub` the sub-items of a link, indented under it; `t-shell-link` one navigation link; the current page has aria-current="page", the parent of the current page data-current-section; `t-shell-icon` the icon of a link; `t-shell-initial` the first letter of the label, for a link without an icon; `t-shell-label` the text of a link; `t-shell-hint` a short muted text after the label (NavItem.hint), such as a group or a pack; `t-shell-chevron` the chevron of a link that opens its sub-items; `t-shell-search` the search of the shell (the search prop, role="search"); on a phone it shows as a row under the bar while data-open; `t-shell-search-button` the phone's search button: it opens the search row (aria-expanded, aria-controls); without the script a link to the row; `t-shell-actions` the global actions, such as a user menu; `t-shell-main` the content region (main); it never scrolls, the Page inside does; `t-shell-footer` the footer facts and the theme controls; `t-shell-facts` the list of footer facts; `t-shell-fact` one fact: a version, a link; `t-shell-theme` holds the theme controls; `t-shell-sidebar` a side column; `t-shell-menu-button` the button that opens the navigation drawer on a phone
- Props: `shell`: topnav | sidenav | bare | workspace; `theme`: skin | palette | mode; `contained`: text or content
- HTML kit: script

Example: The parts of a frame: bar, brand, search, actions, main region, footer

```tsx
<Frame />
```

```html
<div class="t-shell" data-shell="bare" data-t="shell"><a class="t-shell-skip" href="#_R_0_">Skip to content</a><header class="t-shell-bar"><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span><span class="t-shell-brand-name">Console</span></a><div class="t-shell-search" id="_R_0H1_" role="search"><div class="t-control t-input-group t-search" data-t="search" data-size="sm" data-shortcut="off"><span class="t-input-addon t-search-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></span><input type="search" class="t-input-native" placeholder="Search" aria-label="Search the console" autoComplete="off" value=""/></div></div><a class="t-btn t-shell-search-button" data-variant="ghost" data-icon-only="" href="#_R_0H1_" aria-label="Search" aria-controls="_R_0H1_" aria-expanded="false"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></a><div class="t-shell-actions"><button type="button" class="t-btn" data-variant="ghost" data-icon-only="" aria-label="alice" data-t="menu" data-t-menu="_R_4d_" aria-haspopup="menu" aria-expanded="false"><span class="t-avatar" role="img" aria-label="alice" data-size="sm"><span class="t-avatar-initials" aria-hidden="true">A</span></span></button><div class="t-popup t-menu" id="_R_4d_" role="menu" aria-label="alice" data-align="end" hidden=""><a href="#profile" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="profile"><span class="t-menu-label">Profile</span></a><a href="#keys" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="keys"><span class="t-menu-label">Access keys</span></a><div class="t-menu-separator" role="separator" aria-orientation="horizontal"></div><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="sign-out"><span class="t-menu-label">Sign out</span></button></div></div></header><main class="t-shell-main" id="_R_0_" tabindex="-1"><div class="t-page"><header class="t-page-header"><div class="t-page-heading"><h1 class="t-page-title" id="_R_l_">Services</h1><p class="t-page-description">What runs on every host.</p></div><div class="t-page-actions"><button type="button" class="t-btn" data-variant="primary">Add service</button></div></header><section class="t-page-body" tabindex="0" aria-labelledby="_R_l_"><div class="t-grid" data-min="2xs"><div class="t-stat" data-tone="success"><div class="t-stat-label">Running</div><div class="t-stat-value">12</div></div><div class="t-stat" data-tone="warning"><div class="t-stat-label">Degraded</div><div class="t-stat-value">1</div></div><div class="t-stat"><div class="t-stat-label">Hosts</div><div class="t-stat-value">3</div></div></div><div class="t-toolbar"><div class="t-toolbar-start"><div class="t-control t-input-group t-search" data-t="search" data-size="sm" data-shortcut="off"><span class="t-input-addon t-search-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></span><input type="search" class="t-input-native" placeholder="Filter" aria-label="Filter services" autoComplete="off" value=""/></div></div><div class="t-toolbar-end"><button type="button" class="t-btn" data-size="sm">Export</button></div></div><div class="t-table-wrap"><table class="t-table"><caption id="_R_tl_">Services</caption><thead><tr><th scope="col">Name</th><th scope="col">Host</th><th scope="col">Status</th><th scope="col" data-priority="low">Image</th></tr></thead><tbody><tr><th data-label="Name" scope="row">web-1</th><td data-label="Host">nas</td><td data-label="Status"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td>
<!-- … cut here; the whole markup: reference/core/shell-base.html -->
```

<a id="sign-in"></a>

## Sign-in page (`sign-in`)

A centred sign-in card: brand, title, a real form that password managers fill (name or email, password, keep me signed in), the server's error above it, other ways under an "or" line, and links under it. In the HTML kit it posts to `action`.

- React: `import { SignInPage } from "tailor/core";`
- Classes: `t-sign-in`; parts: `t-sign-in-box` the card, capped at a narrow measure; `t-sign-in-head` the brand and the title; `t-sign-in-brand` the logo and the app name; `t-sign-in-footer` a line of links under the card's content
- Props: `identifier`: email | username; `action`: text or content; `title`: text or content
- HTML kit: markup

Example: Default

```tsx
<Demo />
```

```html
<div class="t-status-page t-sign-in"><div class="t-sign-in-box"><div class="t-card"><div class="t-card-body"><div class="t-stack" data-gap="4"><div class="t-sign-in-head"><h1 class="t-status-page-title">Sign in</h1></div><form noValidate="" action="/sign-in" method="post"><div class="t-stack"><div class="t-field"><label class="t-field-label" for="_R_1e_" id="_R_1e_-label">Username</label><div class="t-field-control"><input id="_R_1e_" type="text" autoComplete="username" class="t-control t-input" name="username"/></div><p class="t-field-error" id="_R_1e_-error" aria-live="polite"></p></div><div class="t-field"><label class="t-field-label" for="_R_2e_" id="_R_2e_-label">Password</label><div class="t-field-control"><div class="t-control t-input-group t-secret" data-t="secret"><input id="_R_2e_" class="t-input-native" autoComplete="current-password" spellCheck="false" type="password" name="password"/></div></div><p class="t-field-error" id="_R_2e_-error" aria-live="polite"></p></div><label class="t-check"><input class="t-check-input" aria-labelledby="_R_3e_-label" type="checkbox" name="remember" value="1"/><span class="t-check-label" id="_R_3e_-label">Keep me signed in</span></label><button type="submit" class="t-btn" data-variant="primary">Sign in</button></div></form></div></div></div></div></div>
```

<a id="skeleton"></a>

## Skeleton (`skeleton`)

A grey placeholder in the shape of content that is still loading. It is hidden from screen readers: give the region that loads aria-busy="true" until the content is there.

- React: `import { Skeleton } from "tailor/core";`
- Classes: `t-skeleton`; parts: `t-skeleton-line` one line of a text placeholder; the last one is shorter
- Props: `shape`: text | box | circle; `lines`: text or content; `size`: sm | md | lg
- HTML kit: markup

Example: Text

```tsx
<Stack gap="5">
  <Skeleton />
  <Skeleton lines={3} />
</Stack>
```

```html
<div class="t-stack" data-gap="5"><div class="t-skeleton" aria-hidden="true"><span class="t-skeleton-line"></span></div><div class="t-skeleton" aria-hidden="true"><span class="t-skeleton-line"></span><span class="t-skeleton-line"></span><span class="t-skeleton-line"></span></div></div>
```

<a id="slider"></a>

## Slider (`slider`)

A value in a range, set by dragging or with the arrow keys. For an exact number use a number field.

- React: `import { Slider } from "tailor/core";`
- Classes: `t-slider`; parts: `t-slider-header` the row with the label and the shown value; `t-slider-label` the visible label; `t-slider-value` the shown value, when showValue is set; `t-slider-native` the native range input, drawn: its rail shows the fill up to the value
- HTML kit: script

Example: With the value shown

```tsx
<Slider label="Volume" name="volume" defaultValue={40} showValue />
```

```html
<div class="t-slider" data-t="slider" style="--t-slider-value:0.4"><div class="t-slider-header"><label class="t-slider-label" for="_R_0_">Volume</label><output class="t-slider-value" for="_R_0_">40</output></div><input id="_R_0_" type="range" class="t-slider-native" min="0" max="100" step="1" name="volume" value="40"/></div>
```

<a id="sparkline"></a>

## Sparkline (`sparkline`)

A small line of values over time, optionally with the area under it, as wide as its container. One image with an accessible name; say the latest value in text next to it.

- React: `import { Sparkline } from "tailor/core";`
- Classes: `t-sparkline`; parts: `t-sparkline-line` the line through the values; `t-sparkline-area` the area under the line
- Props: `tone`: neutral | accent | success | warning | danger | info; `size`: sm | md
- HTML kit: markup

Example: Line and area

```tsx
<Stack>
  <Sparkline values={traffic} label="Requests per minute on web-1, last hour" />
  <Sparkline values={traffic} label="Requests per minute on web-2, last hour" area />
</Stack>
```

```html
<div class="t-stack"><svg class="t-sparkline" role="img" aria-label="Requests per minute on web-1, last hour" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="t-sparkline-line" d="…"></path></svg><svg class="t-sparkline" role="img" aria-label="Requests per minute on web-2, last hour" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="t-sparkline-area" d="…"></path><path class="t-sparkline-line" d="…"></path></svg></div>
```

<a id="spinner"></a>

## Spinner (`spinner`)

Shows activity with no known length. It takes the colour of the text around it; for a known length use a progress bar.

- React: `import { Spinner } from "tailor/core";`
- Classes: `t-spinner`
- Props: `size`: sm | md | lg
- HTML kit: markup

Example: Sizes

```tsx
<Cluster>
  <Spinner size="sm" />
  <Spinner />
  <Spinner size="lg" />
</Cluster>
```

```html
<div class="t-cluster"><span class="t-spinner" role="status" data-size="sm"><span class="t-sr-only">Loading</span></span><span class="t-spinner" role="status"><span class="t-sr-only">Loading</span></span><span class="t-spinner" role="status" data-size="lg"><span class="t-sr-only">Loading</span></span></div>
```

<a id="split"></a>

## Split (`split`)

Two panes with a handle between them that the user drags or moves with the arrow keys. In a narrow space a row split stacks its panes.

- React: `import { Split } from "tailor/core";`
- Classes: `t-split`; parts: `t-split-pane` one of the two panes; it scrolls alone; `t-split-handle` the separator between the panes, focusable
- Props: `direction`: row | column; `defaultSize`: text or content; `min`: text or content; `max`: text or content; `storageKey`: text or content; `label`: text or content; `first`: text or content; `second`: text or content
- HTML kit: script

Example: Side by side

```tsx
<Split label="Resize the host list" first={hosts} second={detail} />
```

```html
<div class="t-split" data-t="split" data-default-size="50" data-min="15" data-max="85"><div class="t-split-pane" id="_R_0_-first"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_3_-title">Hosts</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_3_-title" data-padding="none"><ul><li><button type="button" class="t-btn" data-variant="ghost">web-1</button></li><li><button type="button" class="t-btn" data-variant="ghost">web-2</button></li><li><button type="button" class="t-btn" data-variant="ghost">nas</button></li><li><button type="button" class="t-btn" data-variant="ghost">db-1</button></li><li><button type="button" class="t-btn" data-variant="ghost">cache-1</button></li><li><button type="button" class="t-btn" data-variant="ghost">mail</button></li></ul></section></div></div><div class="t-split-handle" role="separator" tabindex="0" aria-orientation="vertical" aria-valuenow="50" aria-valuemin="15" aria-valuemax="85" aria-label="Resize the host list" aria-controls="_R_0_-first"></div><div class="t-split-pane"><div class="t-pane"><header class="t-pane-header"><h2 class="t-pane-title" id="_R_7_-title">web-1</h2></header><section class="t-pane-body" tabindex="0" aria-labelledby="_R_7_-title"><p>Serves example.com. Drag the handle or move it with the arrow keys; Home and End go to the limits.</p></section></div></div></div>
```

<a id="stack"></a>

## Stack (`stack`)

Puts its children in a column with one gap between them.

- React: `import { Stack } from "tailor/core";`
- Classes: `t-stack`
- Props: `gap`: 0 | 1 | 2 | 3 | 4 | 5 | 6; `align`: start | center | end | stretch
- HTML kit: markup

Example: A column

```tsx
<Stack align="start">
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</Stack>
```

```html
<div class="t-stack" data-align="start"><button type="button" class="t-btn">First</button><button type="button" class="t-btn">Second</button><button type="button" class="t-btn">Third</button></div>
```

<a id="stat"></a>

## Stat (`stat`)

One number with its meaning, for dashboards: a label, a large value, a line of context and an optional small chart. With an address, the whole stat is a link.

- React: `import { Stat } from "tailor/core";`
- Classes: `t-stat`; parts: `t-stat-label` what the number means; `t-stat-link` the link in the label of a clickable stat; its hit area covers the stat; `t-stat-value` the number; `t-stat-sub` context: a change or a unit; `t-stat-chart` a box of fixed height at the bottom for a small chart
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: A row of stats

```tsx
<Grid min="2xs">
  <Stat label="Hosts" value="12" sub="2 added this week" />
  <Stat label="Running" value="11" tone="success" sub="of 12" />
  <Stat label="Failed checks" value="3" tone="danger" sub="+2 since yesterday" />
  <Stat label="Disk used" value="91%" tone="warning" sub="nas, 3.6 of 4 TB" />
</Grid>
```

```html
<div class="t-grid" data-min="2xs"><div class="t-stat"><div class="t-stat-label">Hosts</div><div class="t-stat-value">12</div><div class="t-stat-sub">2 added this week</div></div><div class="t-stat" data-tone="success"><div class="t-stat-label">Running</div><div class="t-stat-value">11</div><div class="t-stat-sub">of 12</div></div><div class="t-stat" data-tone="danger"><div class="t-stat-label">Failed checks</div><div class="t-stat-value">3</div><div class="t-stat-sub">+2 since yesterday</div></div><div class="t-stat" data-tone="warning"><div class="t-stat-label">Disk used</div><div class="t-stat-value">91%</div><div class="t-stat-sub">nas, 3.6 of 4 TB</div></div></div>
```

<a id="state-label"></a>

## State label (`state-label`)

A status in words with an icon, such as Running or Failed. The icon and the words carry the meaning, never the colour alone.

- React: `import { StateLabel } from "tailor/core";`
- Classes: `t-state`; parts: `t-state-icon` the icon; each tone but neutral and accent has a default one
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Tones

```tsx
<Cluster gap="5">
  <StateLabel tone="success">Running</StateLabel>
  <StateLabel tone="warning">Degraded</StateLabel>
  <StateLabel tone="danger">Failed</StateLabel>
  <StateLabel tone="info">Scheduled</StateLabel>
  <StateLabel tone="accent">Pinned</StateLabel>
  <StateLabel>Stopped</StateLabel>
</Cluster>
```

```html
<div class="t-cluster" data-gap="5"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span><span class="t-state" data-tone="warning"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-warning"></use></svg></span>Degraded</span><span class="t-state" data-tone="danger"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-danger"></use></svg></span>Failed</span><span class="t-state" data-tone="info"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></span>Scheduled</span><span class="t-state" data-tone="accent">Pinned</span><span class="t-state" data-tone="neutral">Stopped</span></div>
```

<a id="status-dot"></a>

## Status dot (`status-dot`)

A small dot for a live state next to a name. Its label is hidden text unless shown; a pulse marks work in progress.

- React: `import { StatusDot } from "tailor/core";`
- Classes: `t-dot`; parts: `t-dot-label` the visible label (a hidden label uses t-sr-only)
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: With visible labels

```tsx
<Cluster gap="5">
  {TONES.map((tone) => (
    <StatusDot key={tone} tone={tone} label={tone} showLabel />
  ))}
</Cluster>
```

```html
<div class="t-cluster" data-gap="5"><span class="t-dot" data-tone="neutral"><span class="t-dot-label">neutral</span></span><span class="t-dot" data-tone="accent"><span class="t-dot-label">accent</span></span><span class="t-dot" data-tone="success"><span class="t-dot-label">success</span></span><span class="t-dot" data-tone="warning"><span class="t-dot-label">warning</span></span><span class="t-dot" data-tone="danger"><span class="t-dot-label">danger</span></span><span class="t-dot" data-tone="info"><span class="t-dot-label">info</span></span></div>
```

<a id="stepper"></a>

## Stepper (`stepper`)

Shows the steps of a process and where the user is. Each step is done, current (aria-current="step") or upcoming. A horizontal stepper turns vertical in a narrow container.

- React: `import { Stepper } from "tailor/core";`
- Classes: `t-stepper`; parts: `t-stepper-list` the <ol> of steps; `t-stepper-step` one step, with data-state="done|current|upcoming"; `t-stepper-marker` the number of the step, or a check when it is done; `t-stepper-text` the label and the description; `t-stepper-label` the name of the step; a link on a done step that has an address; `t-stepper-description` an optional line under the label
- Props: `orientation`: horizontal | vertical
- HTML kit: markup

Example: Horizontal

```tsx
<Stepper steps={steps} current="access" />
```

```html
<div class="t-stepper"><ol class="t-stepper-list"><li class="t-stepper-step" data-state="done"><span class="t-stepper-marker"><svg class="t-icon" viewBox="0 0 16 16" role="img" aria-label="Done"><use href="/tailor/icons.svg#t-check"></use></svg></span><span class="t-stepper-text"><span class="t-stepper-label"><a href="#host">Host</a></span><span class="t-stepper-description">web-1</span></span></li><li class="t-stepper-step" data-state="done"><span class="t-stepper-marker"><svg class="t-icon" viewBox="0 0 16 16" role="img" aria-label="Done"><use href="/tailor/icons.svg#t-check"></use></svg></span><span class="t-stepper-text"><span class="t-stepper-label"><a href="#services">Services</a></span><span class="t-stepper-description">3 picked</span></span></li><li class="t-stepper-step" data-state="current" aria-current="step"><span class="t-stepper-marker">3</span><span class="t-stepper-text"><span class="t-stepper-label">Access</span><span class="t-stepper-description">Who may sign in</span></span></li><li class="t-stepper-step" data-state="upcoming"><span class="t-stepper-marker">4</span><span class="t-stepper-text"><span class="t-stepper-label">Review</span></span></li></ol></div>
```

<a id="switch"></a>

## Switch (`switch`)

An on/off setting that applies at once. For a choice that a form sends later, use a checkbox.

- React: `import { Switch } from "tailor/core";`
- Classes: `t-switch`; parts: `t-switch-input` the track: a native checkbox with role switch in the HTML kit, the Base UI switch in React; `t-switch-thumb` the thumb in the React kit; the HTML kit draws it as the track's ::before; `t-switch-label` the label text; the whole t-switch is the hit area; `t-switch-description` an optional line under the label
- HTML kit: markup

Example: Alone

```tsx
<Switch name="alerts" value="on" label="Alerts" />
```

```html
<label class="t-switch"><input class="t-switch-input" aria-labelledby="_R_0_-label" type="checkbox" role="switch" name="alerts" value="on"/><span class="t-switch-label" id="_R_0_-label">Alerts</span></label>
```

<a id="table"></a>

## Table (`table`)

A plain table for a small, fixed set of rows. In a narrow box each row becomes a card, or the table scrolls sideways.

- React: `import { Table } from "tailor/core";`
- Classes: `t-table`; parts: `t-table-wrap` the box around the table: the size container, with the border and the corners
- Props: `density`: default | compact; `narrow`: cards | scroll; `kind`: text | num | actions | icon; `priority`: default | low; `width`: 2xs | xs | sm; `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Services

```tsx
<Table
  caption="Services"
  columns={columns}
  rows={services}
  rowKey={(s) => s.name}
  rowTone={(s) => TONE[s.status]}
/>
```

```html
<div class="t-table-wrap"><table class="t-table"><caption id="_R_0_">Services</caption><thead><tr><th scope="col">Name</th><th scope="col">Host</th><th scope="col">Status</th><th scope="col" data-priority="low">Image</th><th scope="col" data-kind="num">Memory (MB)</th><th scope="col">Updated</th><th scope="col" data-kind="actions">Actions</th></tr></thead><tbody><tr data-tone="success"><th data-label="Name" scope="row">web-1</th><td data-label="Host">nas</td><td data-label="Status"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td><td data-label="Image" data-priority="low">nginx:1.27</td><td data-label="Memory (MB)" data-kind="num">64</td><td data-label="Updated"><time class="t-time" dateTime="2026-11-15T10:00:00.000Z" title="November 15, 2026 at 11:00 AM" data-t="relative-time">1 week ago</time></td><td data-label="Actions" data-kind="actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for web-1"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></td></tr><tr data-tone="warning"><th data-label="Name" scope="row">api</th><td data-label="Host">nas</td><td data-label="Status"><span class="t-state" data-tone="warning"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-warning"></use></svg></span>Degraded</span></td><td data-label="Image" data-priority="low">example/api:3.4.1</td><td data-label="Memory (MB)" data-kind="num">412</td><td data-label="Updated"><time class="t-time" dateTime="2026-11-14T10:00:00.000Z" title="November 14, 2026 at 11:00 AM" data-t="relative-time">1 week ago</time></td><td data-label="Actions" data-kind="actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for api"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></td></tr><tr data-tone="success"><th data-label="Name" scope="row">db</th><td data-label="Host">web-1</td><td data-label="Status"><span class="t-state" data-tone="success"><span class="t-state-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-success"></use></svg></span>Running</span></td><td data-label="Image" data-priority="low">postgres:17</td><td data-label="Memory (MB)" data-kind="num">1536</td><td data-label="Updated"><time class="t-time" dateTime="2026-11-06T12:00:00.000Z" title="November 6, 2026 at 1:00 PM" data-t="relative-time">2 weeks ago</time></td><td data-label="Actions" data-kind="actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for db"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></td></tr><tr data-tone="neutral"><th data-label="Name" scope="row">backup-worker-with-a-long-name</th><td data-label="Host">nas</td><td data-label="Status"><span class="t-state" data-tone="neutral">Stopped</span></td><td data-label="Image" data-priority="low">example/backup:2026.11</td><td data-label="Memory (MB)" data-kind="num">0</td><td data-label="Updated"><time class="t-time" dateTime="2026-10-06T12:00:00.000Z" title="October 6, 2026 at 2:00 PM" data-t="relative-time">1 month ago</time></td><td data-label="Actions" data-kind="actions"><button type="button" class="t-btn" data-variant="ghost" data-size="sm" data-icon-only="" aria-label="Actions for backup-worker-with-a-long-name"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-more"></use></svg></button></td></tr></tbody></table></div>
```

<a id="tabs"></a>

## Tabs (`tabs`)

Switches between panels in one view (Tabs), or between the sub-pages of a page with the same look (NavTabs: a <nav> with data-kind="nav" and links). Tabs that do not fit scroll sideways inside the list, with a fade at the edge that has more. Without a script, the current tab starts in view only where the browser supports scroll-initial-target (Chromium).

- React: `import { Tabs, NavTabs } from "tailor/core";`
- Classes: `t-tabs`; parts: `t-tabs-list` the row of tabs: role="tablist", or a <ul> in the nav form; `t-tab` one tab: a button with role="tab" and aria-selected, or a link with aria-current="page"; `t-tab-label` the text of a tab; `t-tabs-panel` the content of one tab, role="tabpanel"
- Props: `variant`: line | pills; `kind`: panels | nav
- HTML kit: script

Example: Line

```tsx
<Tabs label="Host sections" tabs={sections} />
```

```html
<div class="t-tabs" data-t="tabs"><div class="t-tabs-list" role="tablist" aria-label="Host sections"><button type="button" class="t-tab" role="tab" id="_R_0_-tab-overview" aria-selected="true" aria-controls="_R_0_-panel-overview" tabindex="0"><span class="t-tab-label">Overview</span></button><button type="button" class="t-tab" role="tab" id="_R_0_-tab-services" aria-selected="false" aria-controls="_R_0_-panel-services" tabindex="-1"><span class="t-tab-label">Services</span><span class="t-counter" data-tone="neutral">3</span></button><button type="button" class="t-tab" role="tab" id="_R_0_-tab-logs" aria-selected="false" aria-controls="_R_0_-panel-logs" tabindex="-1"><span class="t-tab-label">Logs</span><span class="t-counter" data-tone="neutral">128</span></button><button type="button" class="t-tab" role="tab" id="_R_0_-tab-backups" aria-selected="false" aria-controls="_R_0_-panel-backups" aria-disabled="true" data-disabled="" tabindex="-1"><span class="t-tab-label">Backups</span></button><button type="button" class="t-tab" role="tab" id="_R_0_-tab-settings" aria-selected="false" aria-controls="_R_0_-panel-settings" tabindex="-1"><span class="t-tab-label">Settings</span></button></div><div class="t-tabs-panel" role="tabpanel" id="_R_0_-panel-overview" aria-labelledby="_R_0_-tab-overview" tabindex="0"><p>web-1 runs three services and has been up for 12 days.</p></div><div class="t-tabs-panel" role="tabpanel" id="_R_0_-panel-services" aria-labelledby="_R_0_-tab-services" tabindex="0"><p>nginx, api and worker run on web-1.</p></div><div class="t-tabs-panel" role="tabpanel" id="_R_0_-panel-logs" aria-labelledby="_R_0_-tab-logs" tabindex="0"><p>128 new lines since the last restart.</p></div><div class="t-tabs-panel" role="tabpanel" id="_R_0_-panel-backups" aria-labelledby="_R_0_-tab-backups" tabindex="0"><p>No backups yet.</p></div><div class="t-tabs-panel" role="tabpanel" id="_R_0_-panel-settings" aria-labelledby="_R_0_-tab-settings" tabindex="0"><p>Name, address and owner of web-1.</p></div></div>
```

<a id="textarea"></a>

## Text area (`textarea`)

Several lines of text. It resizes vertically; with auto-grow it follows its content up to a maximum height.

- React: `import { Textarea } from "tailor/core";`
- Classes: `t-textarea`
- Props: `size`: sm | md | lg
- HTML kit: markup

Example: With a placeholder

```tsx
<Textarea aria-label="Notes" name="notes" placeholder="What the host is for" />
```

```html
<textarea name="notes" aria-label="Notes" placeholder="What the host is for" class="t-control t-textarea" rows="3"></textarea>
```

<a id="theme-pickers"></a>

## Theme pickers (`theme-pickers`)

The controls that change the skin, the palette and the mode of the page, for a footer or a settings page. layout="compact" takes one row for a narrow column: one button shows the skin and the palette and opens them as two selects in a popover; the mode button stays beside it.

- React: `import { ThemeProvider, useHasTheme, useTheme, ThemePickers } from "tailor/core";`
- Classes: `t-theme-pickers`; parts: `t-theme-mode` the icon button that switches between dark and light; its label says what a click does; `t-theme-pickers-trigger` compact: the button that shows the skin and the palette and opens the popover; its text truncates, its aria-label is "Theme: " and the same values
- Props: `parts`: skin | palette | mode; `size`: sm | md | lg; `layout`: inline | compact
- HTML kit: script

Example: Skin, palette and mode

```tsx
<Demo>
  <ThemePickers />
</Demo>
```

```html
<div class="t-theme-pickers" data-t="theme-pickers"></div>
```

<a id="timeline"></a>

## Timeline (`timeline`)

Events in time order, each with a toned marker on a line that connects them.

- React: `import { Timeline, TimelineItem } from "tailor/core";`
- Classes: `t-timeline`; parts: `t-timeline-item` one event; `t-timeline-marker` a dot or an icon in the tone of the event, with the line to the next one; `t-timeline-content` the title, the time and the body; `t-timeline-title` what happened; `t-timeline-time` when it happened; `t-timeline-body` more detail
- Props: `tone`: neutral | accent | success | warning | danger | info
- HTML kit: markup

Example: Deploy events

```tsx
<Timeline label="Deploys of web-1">
  <TimelineItem
    title="Deployed nginx:1.27 to nas"
    time={<RelativeTime date={at("11:48")} />}
    tone="success"
    icon={<Icon name="bi:check-circle-fill" />}
  >
    Started by alice. Health check passed after 8 seconds.
  </TimelineItem>
  <TimelineItem
    title="Health check failed"
    time={<RelativeTime date={at("11:46")} />}
    tone="danger"
    icon={<Icon name="bi:x-circle-fill" />}
  >
    GET https://web-1.example.com/health returned 502 three times in a row.
  </TimelineItem>
  <TimelineItem title="Image pulled" time={<RelativeTime date={at("11:44")} />} tone="info" />
  <TimelineItem title="Deploy queued" time={<RelativeTime date={at("11:43")} />} />
</Timeline>
```

```html
<ol class="t-timeline" aria-label="Deploys of web-1"><li class="t-timeline-item" data-tone="success"><span class="t-timeline-marker" aria-hidden="true"><span><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-check-circle-fill"></use></svg></span></span><div class="t-timeline-content"><span class="t-timeline-title">Deployed nginx:1.27 to nas</span><span class="t-timeline-time"><time class="t-time" dateTime="2026-11-15T11:48:00.000Z" title="November 15, 2026 at 12:48 PM" data-t="relative-time">1 week ago</time></span><div class="t-timeline-body">Started by alice. Health check passed after 8 seconds.</div></div></li><li class="t-timeline-item" data-tone="danger"><span class="t-timeline-marker" aria-hidden="true"><span><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-x-circle-fill"></use></svg></span></span><div class="t-timeline-content"><span class="t-timeline-title">Health check failed</span><span class="t-timeline-time"><time class="t-time" dateTime="2026-11-15T11:46:00.000Z" title="November 15, 2026 at 12:46 PM" data-t="relative-time">1 week ago</time></span><div class="t-timeline-body">GET https://web-1.example.com/health returned 502 three times in a row.</div></div></li><li class="t-timeline-item" data-tone="info"><span class="t-timeline-marker" aria-hidden="true"><span></span></span><div class="t-timeline-content"><span class="t-timeline-title">Image pulled</span><span class="t-timeline-time"><time class="t-time" dateTime="2026-11-15T11:44:00.000Z" title="November 15, 2026 at 12:44 PM" data-t="relative-time">1 week ago</time></span></div></li><li class="t-timeline-item"><span class="t-timeline-marker" aria-hidden="true"><span></span></span><div class="t-timeline-content"><span class="t-timeline-title">Deploy queued</span><span class="t-timeline-time"><time class="t-time" dateTime="2026-11-15T11:43:00.000Z" title="November 15, 2026 at 12:43 PM" data-t="relative-time">1 week ago</time></span></div></li></ol>
```

<a id="toast"></a>

## Toast (`toast`)

A short report of an outcome that leaves by itself after 4 s; a danger toast stays until closed. At most 4 show at once and a toast waits while the pointer or the focus is on it. React: render <ToastRegion /> once, then toast(tone, message, { title, action, duration }) from useToast(). HTML: window.Tailor.toast(tone, message, options), or declaratively <button data-t="toast-trigger" data-tone="success" data-message="Saved" data-title="…" data-action="Undo">; a click on that action fires a bubbling "t-toast-action" event on the trigger.

- React: `import { ToastRegion, useToast } from "tailor/core";`
- Classes: `t-toast`; parts: `t-toasts` the region at the bottom end that holds the toasts; `t-toast-icon` the glyph of the tone; `t-toast-content` the title and the text; `t-toast-title` the title, optional; `t-toast-text` the message; `t-toast-action` the action button, optional; `t-toast-close` the close button
- Props: `tone`: success | warning | danger | info
- HTML kit: script

Example: Outcomes

```tsx
<Cluster>
  <ToastRegion />
  <Show tone="success" label="Save" message="The settings of web-1 are saved." />
  <Show tone="info" label="Sync" title="Sync started" message="nas copies 1,204 files." />
  <Show tone="warning" label="Check disk" message="The disk of nas is 91% full." />
  <Show tone="danger" label="Deploy" title="The deploy failed" message="web-1 did not answer." />
  <Show tone="info" label="Archive web-1" message="web-1 is in the archive." action="Undo" />
  <Dialog trigger={<Button>Edit host</Button>} title="Edit host">
    <Show tone="success" label="Apply" message="The changes to web-1 are applied." />
  </Dialog>
</Cluster>
```

```html
<div class="t-cluster"><button type="button" class="t-btn" data-t="toast-trigger" data-tone="success" data-message="The settings of web-1 are saved.">Save</button><button type="button" class="t-btn" data-t="toast-trigger" data-tone="info" data-message="nas copies 1,204 files." data-title="Sync started">Sync</button><button type="button" class="t-btn" data-t="toast-trigger" data-tone="warning" data-message="The disk of nas is 91% full.">Check disk</button><button type="button" class="t-btn" data-t="toast-trigger" data-tone="danger" data-message="web-1 did not answer." data-title="The deploy failed">Deploy</button><button type="button" class="t-btn" data-t="toast-trigger" data-tone="info" data-message="web-1 is in the archive." data-action="Undo">Archive web-1</button><button type="button" class="t-btn" data-t-open="_R_7_">Edit host</button><dialog class="t-dialog" id="_R_7_" data-t="dialog" aria-labelledby="_R_7_-title"><header class="t-dialog-header"><h2 class="t-dialog-title" id="_R_7_-title">Edit host</h2><button type="button" class="t-dialog-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button></header><div class="t-dialog-body"><button type="button" class="t-btn" data-t="toast-trigger" data-tone="success" data-message="The changes to web-1 are applied.">Apply</button></div></dialog></div>
```

<a id="toolbar"></a>

## Toolbar (`toolbar`)

One row of controls above content: filters at the start, actions at the end. In a narrow space the end group goes under the start group.

- React: `import { Toolbar } from "tailor/core";`
- Classes: `t-toolbar`; parts: `t-toolbar-start` filters and search; `t-toolbar-end` actions
- Props: `start`: text or content; `end`: text or content
- HTML kit: markup

Example: Filters at the start, actions at the end

```tsx
<HostToolbar />
```

```html
<div class="t-toolbar"><div class="t-toolbar-start"><select class="t-control t-select" data-t="select" data-placeholder="Select…" aria-label="State"><option value="" hidden="">Select…</option><option value="all" selected="">All states</option><option value="up">Up</option><option value="down">Down</option></select><button type="button" class="t-btn">web-1</button></div><div class="t-toolbar-end"><button type="button" class="t-btn">Export</button><button type="button" class="t-btn" data-variant="primary">Add host</button></div></div>
```

<a id="tooltip"></a>

## Tooltip (`tooltip`)

The name of an icon-only control, shown on hover and on keyboard focus, never on touch. It only repeats the control's label: the control keeps its aria-label. It opens above the control (side "top") or on another side when the control sits at an edge, such as "end" for a collapsed sidebar. HTML: data-t="tooltip" data-tip="Remove" on the control, data-tip-side="start" for another side.

- React: `import { Tooltip } from "tailor/core";`
- Classes: `t-tooltip`; parts: `t-tooltip-positioner` the layer that places the tooltip next to its control
- Props: `side`: top | bottom | start | end
- HTML kit: script

Example: Names of icon-only buttons

```tsx
<Cluster gap="2">
  <Tooltip text="Edit">
    <Button icon={<Icon name="bi:pencil" />} label="Edit" />
  </Tooltip>
  <Tooltip text="Copy">
    <Button icon={<Icon name="bi:clipboard" />} label="Copy" variant="ghost" />
  </Tooltip>
  <Tooltip text="Remove">
    <Button icon={<Icon name="bi:trash" />} label="Remove" variant="danger" />
  </Tooltip>
</Cluster>
```

```html
<div class="t-cluster" data-gap="2"><button type="button" class="t-btn" data-icon-only="" aria-label="Edit" data-t="tooltip" data-tip="Edit"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-pencil"></use></svg></button><button type="button" class="t-btn" data-variant="ghost" data-icon-only="" aria-label="Copy" data-t="tooltip" data-tip="Copy"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-clipboard"></use></svg></button><button type="button" class="t-btn" data-variant="danger" data-icon-only="" aria-label="Remove" data-t="tooltip" data-tip="Remove"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-trash"></use></svg></button></div>
```

<a id="truncate"></a>

## Truncate (`truncate`)

Text cut to one line, or to two or three, with an ellipsis. The full text stays for screen readers.

- React: `import { Truncate } from "tailor/core";`
- Classes: `t-truncate`
- Props: `lines`: 1 | 2 | 3
- HTML kit: markup

Example: One, two and three lines

```tsx
<Stack>
  <Truncate>{long}</Truncate>
  <Truncate lines="2">{long}</Truncate>
  <Truncate lines="3">{long}</Truncate>
</Stack>
```

```html
<div class="t-stack"><span class="t-truncate">The nightly backup of every volume on nas and web-1 finished with warnings: two files changed while they were read, and the copy at example.com took longer than the window allows, so the next run starts an hour earlier.</span><span class="t-truncate" data-lines="2">The nightly backup of every volume on nas and web-1 finished with warnings: two files changed while they were read, and the copy at example.com took longer than the window allows, so the next run starts an hour earlier.</span><span class="t-truncate" data-lines="3">The nightly backup of every volume on nas and web-1 finished with warnings: two files changed while they were read, and the copy at example.com took longer than the window allows, so the next run starts an hour earlier.</span></div>
```
