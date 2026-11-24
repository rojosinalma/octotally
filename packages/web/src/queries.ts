// Server state: one TanStack Query cache for every read, and the few writes the shell shares.
import type { Settings, SettingsPatch, SyncStatus, View } from '@octotally/shared';
import { BUILTIN_VIEWS, DEFAULT_SETTINGS, substituteSettings } from '@octotally/shared';
import { QueryClient, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from 'tailor/core';
import { api } from './api';

const STATUS_POLL_IDLE_MS = 30_000;
const STATUS_POLL_SYNCING_MS = 3_000;
const SIBLINGS_POLL_MS = 5 * 60_000;
/** A refresh starts the sync in the background; the status shows it a moment later. */
const REFRESH_STATUS_DELAY_MS = 1_000;

export const keys = {
  settings: ['settings'] as const,
  status: ['status'] as const,
  views: ['views'] as const,
  repos: ['repos'] as const,
  siblings: ['siblings'] as const,
  version: ['version'] as const,
  /** Every item list: invalidate this to reload all of them. */
  allItems: ['items'] as const,
  items: (q: string) => ['items', q] as const,
  item: (id: string) => ['item', id] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10_000 } },
  });
}

export const useSettingsQuery = () =>
  useQuery({ queryKey: keys.settings, queryFn: () => api.settings().then((r) => r.settings) });

/** The settings, with the defaults until they load. */
export function useSettings(): { settings: Settings; loaded: boolean } {
  const query = useSettingsQuery();
  return { settings: query.data ?? DEFAULT_SETTINGS, loaded: query.data !== undefined };
}

export type SaveOutcome = { ok: true } | { ok: false; message: string };

/** Saves a settings patch, shown at once and put back when the server refuses it. */
export function useUpdateSettings(): (patch: SettingsPatch) => Promise<SaveOutcome> {
  const client = useQueryClient();
  return useCallback(
    async (patch) => {
      const before = client.getQueryData<Settings>(keys.settings);
      if (before) client.setQueryData<Settings>(keys.settings, { ...before, ...patch });
      try {
        const r = await api.patchSettings(patch);
        client.setQueryData(keys.settings, r.settings);
        return { ok: true };
      } catch (e) {
        if (before) client.setQueryData(keys.settings, before);
        return { ok: false, message: (e as Error).message };
      }
    },
    [client],
  );
}

export const useStatus = () =>
  useQuery({
    queryKey: keys.status,
    queryFn: () => api.status().then((r) => r.status),
    refetchInterval: (q) => (q.state.data?.syncing ? STATUS_POLL_SYNCING_MS : STATUS_POLL_IDLE_MS),
  });

/** Starts a sync now; a failure is a toast. */
export function useRefresh(): () => Promise<void> {
  const client = useQueryClient();
  const toast = useToast();
  return useCallback(async () => {
    try {
      await api.refresh();
      client.setQueryData<SyncStatus>(keys.status, (s) => (s ? { ...s, syncing: true } : s));
      window.setTimeout(
        () => void client.invalidateQueries({ queryKey: keys.status }),
        REFRESH_STATUS_DELAY_MS,
      );
    } catch (e) {
      toast('danger', (e as Error).message, { title: 'Refresh failed' });
    }
  }, [client, toast]);
}

export function useViews(): { views: View[]; loaded: boolean } {
  const query = useQuery({ queryKey: keys.views, queryFn: () => api.views().then((r) => r.views) });
  const views = (query.data ?? BUILTIN_VIEWS).toSorted(
    (a, b) => Number(b.builtin) - Number(a.builtin) || a.position - b.position,
  );
  return { views, loaded: query.data !== undefined };
}

export const useRepos = () =>
  useQuery({ queryKey: keys.repos, queryFn: () => api.repos().then((r) => r.repos) });

/** Optional: a failed load only hides the member switcher. */
export const useSiblings = () =>
  useQuery({
    queryKey: keys.siblings,
    queryFn: () => api.siblings().then((r) => r.siblings),
    refetchInterval: SIBLINGS_POLL_MS,
    retry: false,
  });

export const useVersion = () =>
  useQuery({
    queryKey: keys.version,
    queryFn: api.version,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

export const itemsQuery = (q: string) => ({
  queryKey: keys.items(q),
  queryFn: () => api.items(q),
});

/** The query a view stands for, with its `{setting}` placeholders filled in. */
export const viewQuery = (view: View, settings: Settings): string => substituteSettings(view.query, settings);

/** How many items each view holds, by view id; undefined while a count loads or after it failed. */
export function useViewCounts(views: View[], settings: Settings, enabled: boolean): Record<string, number> {
  const results = useQueries({
    queries: views.map((v) => ({ ...itemsQuery(viewQuery(v, settings)), enabled })),
  });
  const counts: Record<string, number> = {};
  views.forEach((v, i) => {
    const total = results[i]?.data?.total;
    if (total !== undefined) counts[v.id] = total;
  });
  return counts;
}
