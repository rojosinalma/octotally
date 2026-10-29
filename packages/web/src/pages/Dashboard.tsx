import type { Item, View } from '@octotally/shared';
import { matchesItem, parseSearch, substituteSettings, tokenize } from '@octotally/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ui, useConfirm } from 'tailor-react';
import { api, type ItemAction } from '../api';
import { BulkBar } from '../components/BulkBar';
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
const HIDDEN_FOR: Record<ItemAction, Item['hidden']> = { mute: 'muted', done: 'done', restore: 'none' };
/** Bulk actions on more items than this ask first. */
const CONFIRM_OVER = 20;
/** Which items an action applies to: restore only hidden ones, mute/done only visible ones. */
const appliesTo = (item: Item, action: ItemAction) =>
  action === 'restore' ? item.hidden !== 'none' : item.hidden === 'none';

export function Dashboard({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const route = useRoute();
  const { settings, settingsLoaded, views, status, refresh } = useApp();
  const { toast } = useToast();
  const confirm = useConfirm();
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

  // Bulk selection (checkboxes). Cleared when the query changes; ids that leave the list drop out.
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const anchor = useRef<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `query` resets the selection.
  useEffect(() => {
    setChecked(new Set());
    anchor.current = null;
  }, [query]);
  useEffect(() => {
    if (!items) return;
    setChecked((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const toggleCheck = useCallback(
    (id: string, shift: boolean) => {
      const from = anchor.current;
      setChecked((prev) => {
        const next = new Set(prev);
        const list = items ?? [];
        const a = from ? list.findIndex((i) => i.id === from) : -1;
        const z = list.findIndex((i) => i.id === id);
        if (shift && a >= 0 && z >= 0) {
          // The range takes the anchor's state (checked → check all, unchecked → uncheck all).
          const on = prev.has(from as string);
          for (const i of list.slice(Math.min(a, z), Math.max(a, z) + 1)) {
            if (on) next.add(i.id);
            else next.delete(i.id);
          }
        } else if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      anchor.current = id;
    },
    [items],
  );
  const toggleAll = useCallback(() => {
    setChecked((prev) =>
      items && prev.size < items.length ? new Set(items.map((i) => i.id)) : new Set<string>(),
    );
  }, [items]);
  const clearChecked = useCallback(() => setChecked(new Set()), []);

  const runBulk = useCallback(
    async (action: ItemAction) => {
      const before = itemsState.data;
      if (!before || bulkBusy) return;
      const targets = before.filter((i) => checked.has(i.id) && appliesTo(i, action));
      if (targets.length === 0) return;
      if (targets.length > CONFIRM_OVER) {
        const verb = action === 'done' ? 'Mark' : action === 'mute' ? 'Mute' : 'Restore';
        const ok = await confirm(
          `${verb} ${targets.length} items${action === 'done' ? ' done' : ''}?`,
          action === 'restore'
            ? 'They come back into the views that match them.'
            : 'They leave the views that show only open work. You can restore them from the Hidden view.',
          { label: `${verb} ${targets.length}` },
        );
        if (!ok) return;
      }
      const parsed = parseSearch(query);
      const now = new Date().toISOString();
      const nextHidden = HIDDEN_FOR[action];
      const ids = new Set(targets.map((i) => i.id));
      const optimistic = (i: Item): Item => ({
        ...i,
        hidden: nextHidden,
        hiddenAt: nextHidden === 'none' ? null : now,
      });
      const keepIds = new Set(targets.filter((i) => matchesItem(parsed, optimistic(i))).map((i) => i.id));
      // Move the cursor off rows that disappear.
      if (selectedId && ids.has(selectedId) && !keepIds.has(selectedId)) {
        const idx = before.findIndex((i) => i.id === selectedId);
        const next =
          before.slice(idx + 1).find((i) => !ids.has(i.id) || keepIds.has(i.id)) ??
          [...before.slice(0, idx)].reverse().find((i) => !ids.has(i.id) || keepIds.has(i.id)) ??
          null;
        setSelectedId(next?.id ?? null);
      }
      if (panelId && ids.has(panelId) && !keepIds.has(panelId)) setPanelId(null);
      itemsState.setData((list) =>
        list
          ? list
              .filter((i) => !ids.has(i.id) || keepIds.has(i.id))
              .map((i) => (ids.has(i.id) ? optimistic(i) : i))
          : list,
      );
      setChecked(new Set());
      setAnnouncement(`${targets.length} ${targets.length === 1 ? 'item' : 'items'} ${ACTION_PAST[action]}`);
      setBulkBusy(true);
      try {
        const r = await api.bulkAction([...ids], action);
        const byId = new Map(r.items.map((i) => [i.id, i]));
        itemsState.setData((list) => (list ? list.map((i) => byId.get(i.id) ?? i) : list));
        if (r.missing.length > 0) {
          toast(`${r.missing.length} ${r.missing.length === 1 ? 'item was' : 'items were'} not found`, {
            description: 'They may have been removed meanwhile; the list is reloaded.',
            variant: 'warning',
          });
          void itemsState.reload();
        }
        void loadCounts();
        void reposState.reload();
      } catch (e) {
        itemsState.setData(before);
        setChecked(ids);
        toast(`Could not ${action} ${targets.length} items`, {
          description: (e as Error).message,
          variant: 'critical',
        });
      } finally {
        setBulkBusy(false);
      }
    },
    [
      itemsState.data,
      itemsState.setData,
      itemsState.reload,
      reposState.reload,
      bulkBusy,
      checked,
      confirm,
      query,
      selectedId,
      panelId,
      toast,
      loadCounts,
    ],
  );

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
      const nextHidden = HIDDEN_FOR[action];
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
        void loadCounts();
      } catch (e) {
        itemsState.setData(before);
        toast(`Could not ${action} item`, { description: (e as Error).message, variant: 'critical' });
      }
    },
    [query, itemsState.data, itemsState.setData, selectedId, panelId, toast, loadCounts],
  );

  /** e / m / u: the checked items when there are any, else the focused one. */
  const act = (action: ItemAction) => {
    if (checked.size > 0) void runBulk(action);
    else if (selected && appliesTo(selected, action)) void runAction(selected, action);
  };

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
    e: () => act('done'),
    m: () => act('mute'),
    u: () => act('restore'),
    s: () => selected && toggleCheck(selected.id, false),
    S: () => selected && toggleCheck(selected.id, true),
    A: () => toggleAll(),
    Escape: () => {
      if (!panelItem && checked.size > 0) clearChecked();
    },
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
        {items && items.length > 0 ? (
          <BulkBar
            items={items}
            checked={checked}
            busy={bulkBusy}
            onToggleAll={toggleAll}
            onAction={(a) => void runBulk(a)}
            onClear={clearChecked}
          />
        ) : (
          <div className="list-summary t-small t-muted" aria-live="polite">
            {items ? '0 items' : ''}
          </div>
        )}
        <ItemList
          items={items}
          loading={itemsState.loading}
          error={itemsState.error}
          status={status}
          query={query}
          selectedId={selectedId}
          checked={checked}
          onCheck={toggleCheck}
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
