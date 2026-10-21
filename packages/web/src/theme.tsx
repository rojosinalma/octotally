// Skin, palette and mode: tailor's switcher (tailor-react) on the stored app settings.
//
// The vendored head snippet (public/tailor/tailor-head.html) paints the cached choice before the first
// render; the server settings win once they load. Changes made with the pickers (footer mode toggle) are
// written back to the settings, so every browser opens with the same look.
import type { Settings } from '@octotally/shared';
import { useEffect, useRef } from 'react';
import { setTailorTheme, type TailorThemeChange } from 'tailor-react';
import { useApp } from './hooks/useApp';

let applying = false;

/** Sets the page theme without writing it back to the settings (the caller already saved it). */
export function applyTheme(change: TailorThemeChange): void {
  applying = true;
  try {
    setTailorTheme(change);
  } finally {
    applying = false;
  }
}

type ThemeKeys = Pick<Settings, 'skin' | 'palette' | 'mode'>;

/** What the page shows now, in settings terms. */
function pageTheme(): ThemeKeys {
  const d = document.documentElement.dataset;
  const choice = d.modeChoice ?? d.mode;
  return {
    skin: d.skin ?? '',
    palette: d.palette ?? '',
    mode: choice === 'dark' || choice === 'light' ? choice : 'auto',
  };
}

/** Keeps the page theme and the `skin`/`palette`/`mode` settings in step. Renders nothing. */
export function ThemeSync() {
  const { settings, settingsLoaded, updateSettings } = useApp();
  const latest = useRef({ settings, settingsLoaded, updateSettings });
  latest.current = { settings, settingsLoaded, updateSettings };

  // Server → page: once the settings arrive, and whenever another tab or client changed them.
  useEffect(() => {
    if (!settingsLoaded) return;
    applyTheme({ skin: settings.skin, palette: settings.palette, mode: settings.mode });
  }, [settingsLoaded, settings.skin, settings.palette, settings.mode]);

  // Page → server: a picker changed the theme.
  useEffect(() => {
    const onTheme = () => {
      const { settings: s, settingsLoaded: loaded, updateSettings: save } = latest.current;
      if (applying || !loaded) return;
      const now = pageTheme();
      const patch: Partial<ThemeKeys> = {};
      if (now.skin && now.skin !== s.skin) patch.skin = now.skin;
      if (now.palette && now.palette !== s.palette) patch.palette = now.palette;
      if (now.mode !== s.mode) patch.mode = now.mode;
      if (Object.keys(patch).length) void save(patch, { silent: true });
    };
    const html = document.documentElement;
    html.addEventListener('t:theme', onTheme);
    return () => html.removeEventListener('t:theme', onTheme);
  }, []);

  return null;
}
