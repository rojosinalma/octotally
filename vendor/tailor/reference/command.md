# tailor 2.3.1: pack command (Command)

Command palette, shortcuts and the shortcuts help.

Requires: core. Libraries (React kit): @tanstack/react-hotkeys@0.25.1. HTML kit: none.

SVG drawing data in the markup shows as `d="…"`, inline images as `data:…`, and markup over 4000 characters is cut. The HTML kit has each example whole in `reference/command/<component>.html`.

<a id="command-palette"></a>

## Command palette (`command-palette`)

A searchable list of commands and places that Mod+K opens near the top of the screen; full screen on a phone.

- React: `import { CommandPalette } from "tailor/command";`
- Classes: `t-command`; parts: `t-command-search` the row with the search field; `t-command-list` the list of results, which scrolls; `t-command-group` one group of results with its title; `t-command-group-label` the title of a group; `t-command-icon` the icon of a result; `t-command-match` the letters of a label that match the search text; `t-command-status` the row that shows loading or no result; `t-command-footer` the key hints at the end
- HTML kit: none

Example: Groups, icons and shortcuts

```tsx
<HotkeysProvider>
  <Groups />
</HotkeysProvider>
```

<a id="hotkeys-help"></a>

## Shortcuts help (`hotkeys-help`)

A dialog that lists every registered keyboard shortcut by group, with a filter. Shift+? opens it.

- React: `import { HotkeysHelp } from "tailor/command";`
- Classes: `t-hotkeys-help`; parts: `t-hotkeys-help-groups` the groups, in as many columns as fit; `t-hotkeys-help-group` one group: its title and its shortcuts; `t-hotkeys-help-title` the title of a group; `t-hotkeys-help-row` one shortcut: its label and its keys
- HTML kit: none

Example: Shortcuts help

```tsx
<HotkeysProvider>
  <Stack align="start">
    <SampleShortcuts />
    <HotkeysHelp trigger={<Button>Keyboard shortcuts</Button>} />
  </Stack>
</HotkeysProvider>
```

<a id="hotkeys"></a>

## Keyboard shortcuts (`hotkeys`)

One registry of the app's keyboard shortcuts: a provider at the root, a hook per shortcut and the keys to show.

- React: `import { HotkeysProvider, HotkeyScope, useHotkey, useHotkeysList, Keys } from "tailor/command";`
- Classes: `t-hotkeys`; parts: `t-hotkeys-keys` the keys of one shortcut; a sequence shows each step
- Props: `keys`: text or content
- HTML kit: none

Example: Registered shortcuts

```tsx
<HotkeysProvider>
  <Registered />
</HotkeysProvider>
```
