# Themes

Octotally is drawn with [tailor](https://github.com/rojosinalma/tailor), so it comes with every tailor
skin and palette. A skin is a whole design system (Primer, Bootstrap, Pico, Simple, Luz, a terminal
look); a palette is the colours. Every palette has a dark and a light mode.

The default is the `primer` skin (the GitHub look), the `ayu` palette and `auto` mode, which follows
your OS. Change it here:

- The sun/moon button at the bottom of the side column switches between dark and light.
- Settings → Appearance picks the skin, the palette and the mode (or "Same as the device" again).
- A link with `?skin=pico&palette=nord&mode=light` previews a look without saving it.
- Over the API: `PUT /api/settings {"skin": "pico", "palette": "nord", "mode": "dark"}`.

The choice is stored with the other settings, so every browser opens with the same look. The browser
also keeps a copy so the page paints in the right colours before the settings load.

## Where the files come from

`public/tailor/` (CSS, skins, palettes, icon sprite and the head lines) and `vendor/tailor/` (the
React kit) are written by the `tailor` command and listed in `tailor.json`: don't edit them by hand.
New skins and palettes arrive with `tailor upgrade`; `tailor icons` rebuilds the icon sprite from the
icon names in the source. The app has no styles of its own, so every part follows the skin and the
palette that are picked.

## Upgrading from 0.5

0.5 drew the UI with tailor 0.x, which had more skins. A stored skin that tailor 2 no longer has
(`daisyui`, `govuk`, `tufte`, `none`) is ignored: the page shows the skin the browser last used, or
`primer`, until another skin is picked in Settings → Appearance.

## Upgrading from 0.3

0.3 had one `theme` setting with the nine Primer themes and Dracula. On the first start of the new
version it is turned into `mode` (light or dark themes keep their mode, `auto` stays `auto`) and
`dark_dracula` becomes the `dracula` palette in dark mode. The old key is removed.
