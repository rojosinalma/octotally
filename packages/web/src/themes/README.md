# Extra Primer themes

Primer Primitives ship nine themes. Files here add more, using the same CSS-variable contract and
selector scheme (`[data-color-mode="dark"][data-dark-theme="<name>"]` plus the `auto` block), so the
app treats them exactly like the stock ones: import the file in `src/theme.tsx`, add the name to the
`Theme` enum in `@octotally/shared` and a label to `THEME_LABELS`. Dark theme names must contain `dark` (Primer React derives `data-color-mode` from the name).

| File | Source |
|---|---|
| `dark_dracula.css` | Generated from `@primer/primitives` `dark.css` with a token-to-[Dracula](https://draculatheme.com) palette mapping (OKLab nearest-colour with a hand-tuned exact map). Do not edit by hand; regenerate from the palette and replace the file. |
