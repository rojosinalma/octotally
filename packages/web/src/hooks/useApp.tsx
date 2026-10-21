import type { Settings, SettingsPatch, SiblingsView, SyncStatus, View } from '@octotally/shared';
import { BUILTIN_VIEWS, DEFAULT_SETTINGS } from '@octotally/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { type ApiError, api } from '../api';
import { useAsync, useInterval } from './useAsync';
import { useToast } from './useToast';

export interface SaveOutcome {
  ok: boolean;
  message: string;
}

export interface AppState {
  settings: Settings;
  settingsLoaded: boolean;
  /**
   * Optimistic patch; reverts on failure. Toasts the outcome unless `silent` (no success toast) or
   * `quiet` (no toast at all: the caller reports it, e.g. a settings row).
   */
  updateSettings: (
    patch: SettingsPatch,
    opts?: { silent?: boolean; quiet?: boolean },
  ) => Promise<SaveOutcome>;
  status: SyncStatus | null;
  statusError: ApiError | null;
  reloadStatus: () => Promise<void>;
  refresh: () => Promise<void>;
  views: View[];
  reloadViews: () => Promise<void>;
  authRequired: boolean;
  logout: () => Promise<void>;
  /** Octoforge sibling list for the member switcher; null when this is no Octoforge member. */
  siblings: SiblingsView | null;
}

const AppContext = createContext<AppState | null>(null);

const STATUS_POLL_IDLE_MS = 30_000;
const STATUS_POLL_SYNCING_MS = 3_000;
const SIBLINGS_POLL_MS = 5 * 60_000;

export function AppProvider({
  authRequired,
  onLoggedOut,
  children,
}: {
  authRequired: boolean;
  onLoggedOut: () => void;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .settings()
      .then((r) => {
        if (cancelled) return;
        setSettings(r.settings);
        setSettingsLoaded(true);
      })
      .catch((e: ApiError) => {
        if (!cancelled) toast('Could not load settings', { description: e.message, variant: 'critical' });
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const updateSettings = useCallback<AppState['updateSettings']>(
    async (patch, opts = {}) => {
      let previous: Settings = DEFAULT_SETTINGS;
      setSettings((s) => {
        previous = s;
        return { ...s, ...patch };
      });
      try {
        const r = await api.patchSettings(patch);
        setSettings(r.settings);
        if (!opts.silent && !opts.quiet) toast('Settings saved');
        return { ok: true, message: 'Saved' };
      } catch (e) {
        setSettings(previous);
        const reason = (e as Error).message;
        if (!opts.quiet) toast('Settings not saved', { description: reason, variant: 'critical' });
        return { ok: false, message: `Not saved: ${reason}` };
      }
    },
    [toast],
  );

  const statusState = useAsync(() => api.status().then((r) => r.status), 'status');
  const syncing = statusState.data?.syncing ?? false;
  useInterval(() => void statusState.reload(), syncing ? STATUS_POLL_SYNCING_MS : STATUS_POLL_IDLE_MS);

  const refresh = useCallback(async () => {
    try {
      await api.refresh();
      statusState.setData((s) => (s ? { ...s, syncing: true } : s));
      toast('Sync started', { variant: 'info', ttlMs: 2500 });
      window.setTimeout(() => void statusState.reload(), 1000);
    } catch (e) {
      toast('Refresh failed', { description: (e as Error).message, variant: 'critical' });
    }
  }, [statusState.reload, statusState.setData, toast]);

  const viewsState = useAsync(() => api.views().then((r) => r.views), 'views');
  const views = viewsState.data ?? BUILTIN_VIEWS;

  // Optional: a failed load only hides the switcher.
  const siblingsState = useAsync(() => api.siblings().then((r) => r.siblings), 'siblings');
  useInterval(() => void siblingsState.reload(), SIBLINGS_POLL_MS);
  const siblings = siblingsState.data ?? null;

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      onLoggedOut();
    }
  }, [onLoggedOut]);

  const value = useMemo<AppState>(
    () => ({
      settings,
      settingsLoaded,
      updateSettings,
      status: statusState.data,
      statusError: statusState.error,
      reloadStatus: statusState.reload,
      refresh,
      views,
      reloadViews: viewsState.reload,
      authRequired,
      logout,
      siblings,
    }),
    [
      settings,
      settingsLoaded,
      updateSettings,
      statusState.data,
      statusState.error,
      statusState.reload,
      refresh,
      views,
      viewsState.reload,
      authRequired,
      logout,
      siblings,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}
