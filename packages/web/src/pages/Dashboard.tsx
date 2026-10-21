import type { Item, View } from '@octotally/shared';
import { matchesItem, parseSearch, substituteSettings, tokenize } from '@octotally/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ui } from 'tailor-react';
import { api, type ItemAction } from '../api';
import { FilterChips } from '../components/FilterChips';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { ItemList } from '../components/ItemList';
import { ItemPanel } from '../components/ItemPanel';
import { SearchBar, type SearchBarHandle } from '../components/SearchBar';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../hooks/useApp';
import { useAsync } from '../hooks/useAsync';
import { useKeyboard } from '../hooks/useKeyboard';
import { useToast } from '../hooks/useToast';
import { navigate, useRoute } from '../router';

const normalize = (q: string) => tokenize(q).join(' ').toLowerCase();

const ACTION_PAST: Record<ItemAction, string> = { mute: 'muted', done: 'marked done', restore: 'restored' };

export function Dashboard({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const route = useRoute();
  const { settings, settingsLoaded, views, status, refresh } = useApp();
  const { toast } = useToast();
  const searchRef = useRef<SearchBarHandle>(null);

  const resolveView = useCallback((view: View) => substituteSettings(view.query, settings), [settings]);
  const defaultQuery = useMemo(() => {
    const view = views.find((v) => v.id === settings.defaultView) ?? views[0];
    return view ? resolveView(view) : '';
  }, [views, settings.defaultView, resolveView]);

  const urlQuery = route.query.get('q');
  const query = urlQuery ?? defaultQuery;
  const setQuery = useCallback((q: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate('/', { query: params });
  }, []);

  // Items for the current query. Wait for settings so {placeholders} in the default view resolve.
  const itemsState = useAsync(() => api.items(query).then((r) => r.items), query, {
    enabled: settingsLoaded || urlQuery !== null,
  });
  const items = itemsState.data;
  const reposState = useAsync(() => api.repos().then((r) => r.repos), 'repos');

  // Lazily fetched counts per view.
  const [viewCounts, setViewCounts] = useState<Record<string, number | undefined>>({});
  const countsKey = views.map((v) => `${v.id}=${resolveView(v)}`).join('|');
  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      views.map(async (v) => {
        try {
          const r = await api.items(resolveView(v));
          return [v.id, r.total] as const;
        } catch {
          return [v.id, undefined] as const;
        }
      }),
    );
    setViewCounts(Object.fromEntries(entries));
  }, [views, resolveView]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `countsKey` re-runs the counts when view queries change.
  useEffect(() => {
    if (!settingsLoaded) return;
    void loadCounts();
  }, [loadCounts, settingsLoaded, countsKey]);

  // Re-fetch when a sync finishes.
  const lastSync = status?.lastSyncAt ?? null;
  const prevSync = useRef(lastSync);
  useEffect(() => {
    if (prevSync.current !== lastSync && prevSync.current !== null) {
      void itemsState.reload();
      void reposState.reload();
      void loadCounts();
    }
    prevSync.current = lastSync;
  }, [lastSync, itemsState.reload, reposState.reload, loadCounts]);

  const activeViewId = useMemo(() => {
    const n = normalize(query);
    return views.find((v) => normalize(resolveView(v)) === n)?.id ?? null;
  }, [views, query, resolveView]);

  // Selection + panel.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const selected = items?.find((i) => i.id === selectedId) ?? null;
  const panelItem = items?.find((i) => i.id === panelId) ?? null;
  useEffect(() => {
    if (items?.length && (!selectedId || !items.some((i) => i.id === selectedId)))
      setSelectedId(items[0]?.id ?? null);
  }, [items, selectedId]);

  const move = (delta: number) => {
    if (!items?.length) return;
    const idx = Math.max(
      0,
      items.findIndex((i) => i.id === selectedId),
    );
    const next = items[Math.min(items.length - 1, Math.max(0, idx + delta))];
    if (next) {
      setSelectedId(next.id);
      setAnnouncement(`${next.title}, ${next.repo} #${next.number}`);
    }
  };

  const runAction = useCallback(
    async (item: Item, action: ItemAction) => {
      const parsed = parseSearch(query);
      const nextHidden = action === 'mute' ? 'muted' : action === 'done' ? 'done' : 'none';
      const optimistic: Item = {
        ...item,
        hidden: nextHidden,
        hiddenAt: nextHidden === 'none' ? null : new Date().toISOString(),
      };
      const keep = matchesItem(parsed, optimistic);
      const before = itemsState.data;
      // Advance the selection before the row disappears.
      if (!keep && selectedId === item.id && before) {
        const idx = before.findIndex((i) => i.id === item.id);
        const next = before[idx + 1] ?? before[idx - 1] ?? null;
        setSelectedId(next?.id ?? null);
      }
      if (!keep && panelId === item.id) setPanelId(null);
      itemsState.setData((list) =>
        list
          ? keep
            ? list.map((i) => (i.id === item.id ? optimistic : i))
            : list.filter((i) => i.id !== item.id)
          : list,
      );
      setAnnouncement(`${item.title} ${ACTION_PAST[action]}`);
      try {
        const r = await api.itemAction(item.id, action);
        itemsState.setData((list) => (list ? list.map((i) => (i.id === item.id ? r.item : i)) : list));
        toast(
          `${ACTION_PAST[action].charAt(0).toUpperCase()}${ACTION_PAST[action].slice(1)}: ${item.title}`,
          {
            ttlMs: 2500,
          },
        );
        void loadCounts();
      } catch (e) {
        itemsState.setData(before);
        toast(`Could not ${action} item`, { description: (e as Error).message, variant: 'critical' });
      }
    },
    [query, itemsState.data, itemsState.setData, selectedId, panelId, toast, loadCounts],
  );

  const openSelected = () => {
    if (selected) window.open(selected.url, '_blank', 'noopener');
  };

  useKeyboard({
    j: () => move(1),
    k: () => move(-1),
    ArrowDown: (e) => {
      if (!panelItem) {
        e.preventDefault();
        move(1);
      }
    },
    ArrowUp: (e) => {
      if (!panelItem) {
        e.preventDefault();
        move(-1);
      }
    },
    o: openSelected,
    Enter: () => {
      if (!panelItem && selected && document.activeElement?.closest('.item-list')) openSelected();
    },
    x: () => selected && setPanelId(selected.id),
    e: () => selected && selected.hidden === 'none' && void runAction(selected, 'done'),
    m: () => selected && selected.hidden === 'none' && void runAction(selected, 'mute'),
    u: () => selected && selected.hidden !== 'none' && void runAction(selected, 'restore'),
    r: () => void refresh(),
    '/': (e) => {
      e.preventDefault();
      searchRef.current?.focus();
    },
    '?': { global: true, handler: onShowShortcuts },
  });

  const suggestContext = useMemo(() => {
    const repos = (reposState.data ?? []).map((r) => r.repo);
    const owners = [...new Set(repos.map((r) => r.split('/')[0] ?? r))];
    const labels = [...new Set((items ?? []).flatMap((i) => i.labels))].sort();
    return { repos, owners, labels };
  }, [reposState.data, items]);

  return (
    <Ui.AppShell
      nav={
        <Header
          onShowShortcuts={onShowShortcuts}
          search={<SearchBar ref={searchRef} value={query} onSubmit={setQuery} context={suggestContext} />}
        />
      }
      side={
        <Sidebar
          query={query}
          onQuery={setQuery}
          activeViewId={activeViewId}
          viewCounts={viewCounts}
          repos={reposState.data ?? []}
          items={items ?? []}
        />
      }
      foot={<Footer />}
    >
      <h1 className="t-visually-hidden">Items</h1>
      <Ui.Stack gap="2" className="dashboard-main">
        <FilterChips query={query} onChange={setQuery} />
        <div className="list-summary t-small t-muted" aria-live="polite">
          {items ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : ''}
        </div>
        <ItemList
          items={items}
          loading={itemsState.loading}
          error={itemsState.error}
          status={status}
          query={query}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onOpenPanel={setPanelId}
          onAction={(item, action) => void runAction(item, action)}
          onClear={() => setQuery('')}
          onRetry={() => void itemsState.reload()}
        />
      </Ui.Stack>
      {panelItem && (
        <ItemPanel
          item={panelItem}
          onClose={() => setPanelId(null)}
          onAction={(i, a) => void runAction(i, a)}
        />
      )}
      <div className="t-visually-hidden" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </Ui.AppShell>
  );
}
