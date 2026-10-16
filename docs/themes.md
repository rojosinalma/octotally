# Themes

All nine Primer themes are available: light, light colorblind, light tritanopia, light high
contrast, dark, dark dimmed, dark colorblind, dark tritanopia, dark high contrast — plus
**Dracula** (`dark_dracula`) and `auto`, which follows the OS. Pick one in Settings (`theme`) or
set it with `PUT /api/settings {"theme": "dark_dimmed"}`.

## Adding a theme

Primer Primitives ship the nine stock themes; extra themes live in `packages/web/src/themes/` as
one CSS file each, using the same CSS-variable contract and selector scheme
(`[data-color-mode="dark"][data-dark-theme="<name>"]` plus the `auto` block), so the app treats
them exactly like the stock ones:

1. Add `packages/web/src/themes/<name>.css` with Primer's token names.
2. Import it in `packages/web/src/theme.tsx`.
3. Add the name to the `Theme` enum in `packages/shared/src/types.ts` and a label to `THEME_LABELS`.

Dark theme names must contain `dark`: Primer React derives `data-color-mode` from the name.

`dark_dracula.css` is generated from `@primer/primitives` `dark.css` with a token-to-
[Dracula](https://draculatheme.com) palette mapping (OKLab nearest colour with a hand-tuned exact
map). Do not edit it by hand; regenerate from the palette and replace the file. Details in
`packages/web/src/themes/README.md`.
