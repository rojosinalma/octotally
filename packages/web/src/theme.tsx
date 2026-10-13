// Theme wiring for Primer React 38 + Primer Primitives 11.
//
// Primitives ship one CSS file per theme; each is scoped to
//   [data-color-mode="light"][data-light-theme="<name>"]  or
//   [data-color-mode="dark"][data-dark-theme="<name>"]    or
//   [data-color-mode="auto"] + prefers-color-scheme.
// Importing all nine makes every theme available at runtime; the active one is chosen by the
// attributes on <html> (set here, so the page background follows) and by the ThemeProvider props
// (so components read the same scheme from context).
import '@primer/primitives/dist/css/primitives.css';
import '@primer/primitives/dist/css/functional/themes/light.css';
import '@primer/primitives/dist/css/functional/themes/light-colorblind.css';
import '@primer/primitives/dist/css/functional/themes/light-tritanopia.css';
import '@primer/primitives/dist/css/functional/themes/light-high-contrast.css';
import '@primer/primitives/dist/css/functional/themes/dark.css';
import '@primer/primitives/dist/css/functional/themes/dark-dimmed.css';
import '@primer/primitives/dist/css/functional/themes/dark-colorblind.css';
import '@primer/primitives/dist/css/functional/themes/dark-tritanopia.css';
import '@primer/primitives/dist/css/functional/themes/dark-high-contrast.css';

import { Theme } from '@octotally/shared';
import { BaseStyles } from '@primer/react';
import { ThemeProvider, type ThemeProviderProps } from '@primer/react/next';
import { type ReactNode, useEffect } from 'react';

export const THEME_STORAGE_KEY = 'octotally.theme';

export const THEME_LABELS: Record<Theme, string> = {
  auto: 'Sync with system',
  light: 'Light',
  light_colorblind: 'Light colorblind',
  light_tritanopia: 'Light tritanopia',
  light_high_contrast: 'Light high contrast',
  dark: 'Dark',
  dark_dimmed: 'Dark dimmed',
  dark_colorblind: 'Dark colorblind',
  dark_tritanopia: 'Dark tritanopia',
  dark_high_contrast: 'Dark high contrast',
};

export const THEMES: Theme[] = Theme.options;

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

/** Primer ThemeProvider props for a settings theme value. */
export function themeProviderProps(
  theme: Theme,
): Pick<ThemeProviderProps, 'colorMode' | 'dayScheme' | 'nightScheme'> {
  if (theme === 'auto') return { colorMode: 'auto', dayScheme: 'light', nightScheme: 'dark' };
  if (theme.startsWith('dark')) return { colorMode: 'dark', dayScheme: 'light', nightScheme: theme };
  return { colorMode: 'light', dayScheme: theme, nightScheme: 'dark' };
}

/** Mirrors the ThemeProvider attributes onto <html> so body/background follow the theme too. */
export function applyThemeToDocument(theme: Theme): void {
  const props = themeProviderProps(theme);
  const html = document.documentElement;
  html.setAttribute('data-color-mode', props.colorMode ?? 'auto');
  html.setAttribute('data-light-theme', props.dayScheme ?? 'light');
  html.setAttribute('data-dark-theme', props.nightScheme ?? 'dark');
}

export function readCachedTheme(): Theme {
  try {
    const cached = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(cached) ? cached : 'auto';
  } catch {
    return 'auto';
  }
}

export function cacheTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the server copy still wins on next load.
  }
}

export function ThemeRoot({ theme, children }: { theme: Theme; children: ReactNode }) {
  useEffect(() => {
    applyThemeToDocument(theme);
    cacheTheme(theme);
  }, [theme]);
  return (
    <ThemeProvider {...themeProviderProps(theme)}>
      <BaseStyles className="app-root">{children}</BaseStyles>
    </ThemeProvider>
  );
}
