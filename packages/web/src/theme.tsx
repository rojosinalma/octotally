// Skin, palette and mode: tailor's theme on the page, kept in step with the stored settings.
//
// The head snippet (public/tailor/head.html) paints the choice cached in this browser before the first render;
// the server settings win once they load, so every browser opens with the same look. A change made on the
// page (the mode button, the Appearance rows) is written back to the settings. A `?skin=`, `?palette=` or
// `?mode=` in the address previews that value and is never saved.
import type { Settings } from '@octotally/shared';
import { useEffect, useRef } from 'react';
import { useTheme } from 'tailor/core';
import { useSettingsQuery, useUpdateSettings } from './queries';

type ThemeKey = 'skin' | 'palette' | 'mode';
const THEME_KEYS: readonly ThemeKey[] = ['skin', 'palette', 'mode'];

const fromAddress = (key: ThemeKey): boolean => new URLSearchParams(window.location.search).has(key);

/** The mode to show for a stored choice: `auto` follows the device. */
export const resolveMode = (mode: Settings['mode']): 'dark' | 'light' =>
  mode === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode;

/** Keeps the page theme and the `skin`, `palette` and `mode` settings in step. Renders nothing. */
export function ThemeSync() {
  const theme = useTheme();
  const settings = useSettingsQuery().data;
  const save = useUpdateSettings();
  const applying = useRef(false);
  const latest = useRef({ settings, save });
  latest.current = { settings, save };

  // Server → page: once the settings arrive, and whenever they change.
  useEffect(() => {
    if (!settings) return;
    const change: { skin?: string; palette?: string; mode?: 'dark' | 'light' } = {};
    if (!fromAddress('skin')) change.skin = settings.skin;
    if (!fromAddress('palette')) change.palette = settings.palette;
    if (!fromAddress('mode')) change.mode = resolveMode(settings.mode);
    applying.current = true;
    try {
      theme.set(change);
    } finally {
      applying.current = false;
    }
  }, [settings, theme.set]);

  // Page → server: a control on the page changed the theme.
  useEffect(() => {
    const onTheme = (event: Event) => {
      const { settings: s, save: write } = latest.current;
      if (applying.current || !s || !(event instanceof CustomEvent)) return;
      const now = event.detail as Record<ThemeKey, string>;
      const patch: Partial<Pick<Settings, ThemeKey>> = {};
      for (const key of THEME_KEYS) {
        if (fromAddress(key)) continue;
        const shown = key === 'mode' ? resolveMode(s.mode) : s[key];
        if (now[key] && now[key] !== shown) Object.assign(patch, { [key]: now[key] });
      }
      if (Object.keys(patch).length) void write(patch);
    };
    document.addEventListener('t:theme', onTheme);
    return () => document.removeEventListener('t:theme', onTheme);
  }, []);

  return null;
}
