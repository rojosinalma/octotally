# Themes

Octotally is drawn with [tailor](https://github.com/rojosinalma/tailor), so it comes with every tailor
skin and palette. A skin is a whole design system (Primer, Pico, daisyUI, a terminal look…); a palette
is the colours. Every palette has a dark and a light mode.

The default is the `primer` skin (the GitHub look), the `ayu` palette and `auto` mode, which follows
your OS. Change it here:

- The sun/moon button in the footer switches between dark and light.
- Settings → Appearance picks the skin and the palette.
- Over the API: `PUT /api/settings {"skin": "pico", "palette": "nord", "mode": "dark"}`.

The choice is stored with the other settings, so every browser opens with the same look. The browser
also keeps a copy so the page paints in the right colours before the settings load.

## Where the files come from

`public/tailor/` (CSS, skins, palettes, icon sprite and the head snippet) and `vendor/tailor-react/`
(the React components) are copied in by tailor's own tool. They carry a `managed by tailor` header:
don't edit them by hand. New skins and palettes arrive when they are synced again. The app's own
styles are in `packages/web/src/app.css` and only use tailor's `--t-*` colour variables, so they follow
whichever palette is picked.

## Upgrading from 0.3

0.3 had one `theme` setting with the nine Primer themes and Dracula. On the first start of the new
version it is turned into `mode` (light or dark themes keep their mode, `auto` stays `auto`) and
`dark_dracula` becomes the `dracula` palette in dark mode. The old key is removed.
