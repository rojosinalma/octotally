import type { Item, View } from '@octotally/shared';
import { matchesItem, parseSearch, tokenize } from '@octotally/shared';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useHotkey } from 'tailor/command';
import {
  Alert,
  Button,
  Check,
  EmptyState,
  Field,
  Icon,
  List,
  Menu,
  type MenuCheckboxItem,
  type MenuItem,
  MultiSelect,
  NotFoundPage,
  Page,
  RelativeTime,
  Skeleton,
  Stack,
  Toolbar,
  useConfirm,
  useToast,
} from 'tailor/core';
import { QueryView } from 'tailor/data';
import { AppLink } from 'tailor/kit/link';
import { api, type ItemAction } from '../api';
import { ItemDrawer } from '../components/ItemDrawer';
import { ItemRow } from '../components/ItemRow';
import { ViewDialog, type ViewDialogState } from '../components/ViewDialog';
import { ROLE_LABELS } from '../lib/colors';
import { plural } from '../lib/format';
import {
  hasToken,
  joinTokens,
  qualifierValues,
  setSingleQualifier,
  toggleToken,
  tokenOptions,
} from '../lib/search';
import {
  itemsQuery,
  keys,
  useRefresh,
  useRepos,
  useSettings,
  useStatus,
  useViews,
  viewQuery,
} from '../queries';

const normalize = (q: string) => tokenize(q).join(' ').toLowerCase();

const HIDDEN_FOR: Record<ItemAction, Item['hidden']> = { mute: 'muted', done: 'done', restore: 'none' };
const VERB: Record<ItemAction, string> = { mute: 'mute', done: 'mark done', restore: 'restore' };
/** Bulk actions on more items than this ask first. */
const CONFIRM_OVER = 20;
/** Restore applies to hidden items only; mute and done to visible ones. */
const appliesTo = (item: Item, action: ItemAction) =>
  action === 'restore' ? item.hidden !== 'none' : item.hidden === 'none';

const TYPE_FACETS = [
  ['is:issue', 'Issues'],
  ['is:pr', 'Pull requests'],
  ['is:discussion', 'Discussions'],
] as const;
const STATE_FACETS = [
  ['is:open', 'Open'],
  ['is:closed', 'Closed'],
  ['is:merged', 'Merged'],
  ['is:draft', 'Draft'],
  ['-linked:pr', 'Needs PR'],
] as const;
const ACTIVITY_FACETS = [
  ['any', 'Any time'],
  ['>7d', 'Last 7 days'],
  ['>30d', 'Last 30 days'],
  ['>90d', 'Last 90 days'],
] as const;

type Items = { items: Item[]; total: number; query: string };

/** The list page: the items of a view (`viewId`) or of a search (`query`), with filters and actions. */
export function ItemsPage({ viewId, query: searchQuery }: { viewId?: string; query?: string }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const refresh = useRefresh();
  const { settings, loaded } = useSettings();
  const { views, loaded: viewsLoaded } = useViews();
  const status = useStatus().data ?? null;
  const repos = useRepos().data ?? [];
  const fieldId = useId();

  const view = viewId ? (views.find((v) => v.id === viewId) ?? null) : null;
  const query = view ? viewQuery(view, settings) : (searchQuery ?? '');
  const ready = viewId ? loaded && viewsLoaded && view !== null : true;
  const queryKey = keys.items(query);
  const items = useQuery({ ...itemsQuery(query), enabled: ready, placeholderData: keepPreviousData });
  const list = items.data?.items ?? [];

  /** Shows a query: as its view when one matches it, else as a search. */
  const setQuery = useCallback(
    (q: string) => {
      const match = views.find((v) => normalize(viewQuery(v, settings)) === normalize(q));
      if (match)
        void navigate({
          to: '/views/$viewId',
          params: { viewId: match.id },
          search: ({ q: _q, ...rest }) => rest,
        });
      else void navigate({ to: '/', search: (s) => ({ ...s, q }) });
    },
    [views, settings, navigate],
  );

  // The keyboard cursor, the checked rows and the details drawer.
  const [cursor, setCursor] = useState<string | null>(null);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const anchor = useRef<string | null>(null);
  const [panel, setPanel] = useState<{ id: string; open: boolean } | null>(null);
  const [dialog, setDialog] = useState<ViewDialogState>(null);
  const [busy, setBusy] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new query clears the selection.
  useEffect(() => {
    setChecked(new Set());
    anchor.current = null;
  }, [query]);
  useEffect(() => {
    if (list.length && (!cursor || !list.some((i) => i.id === cursor))) setCursor(list[0]?.id ?? null);
    setChecked((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => list.some((i) => i.id === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [list, cursor]);

  const current = list.find((i) => i.id === cursor) ?? null;
  const panelItem = panel ? (list.find((i) => i.id === panel.id) ?? null) : null;
  const lastPanelItem = useRef<Item | null>(null);
  if (panelItem) lastPanelItem.current = panelItem;

  const toggleCheck = useCallback(
    (id: string, range: boolean) => {
      const from = anchor.current;
      setChecked((prev) => {
        const next = new Set(prev);
        const a = from ? list.findIndex((i) => i.id === from) : -1;
        const z = list.findIndex((i) => i.id === id);
        if (range && a >= 0 && z >= 0) {
          // The range takes the state of the anchor.
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
    [list],
  );
  const toggleAll = () =>
    setChecked((prev) => (prev.size < list.length ? new Set(list.map((i) => i.id)) : new Set()));

  /** Hides or restores items at once; the list keeps a row only while it still matches the query. */
  const run = useCallback(
    async (targets: Item[], action: ItemAction) => {
      const before = client.getQueryData<Items>(queryKey);
      if (!before || targets.length === 0) return;
      const parsed = parseSearch(query);
      const now = new Date().toISOString();
      const hidden = HIDDEN_FOR[action];
      const ids = new Set(targets.map((i) => i.id));
      const changed = (i: Item): Item => ({ ...i, hidden, hiddenAt: hidden === 'none' ? null : now });
      const keep = new Set(targets.filter((i) => matchesItem(parsed, changed(i))).map((i) => i.id));
      const gone = (i: Item) => ids.has(i.id) && !keep.has(i.id);
      // The cursor moves to the next row that stays.
      if (cursor && ids.has(cursor) && !keep.has(cursor)) {
        const at = before.items.findIndex((i) => i.id === cursor);
        const next =
          before.items.slice(at + 1).find((i) => !gone(i)) ??
          before.items.slice(0, at).findLast((i) => !gone(i)) ??
          null;
        setCursor(next?.id ?? null);
      }
      if (panel && ids.has(panel.id) && !keep.has(panel.id)) setPanel({ ...panel, open: false });
      const rest = before.items.filter((i) => !gone(i)).map((i) => (ids.has(i.id) ? changed(i) : i));
      client.setQueryData<Items>(queryKey, { ...before, items: rest, total: rest.length });
      setChecked((prev) => new Set([...prev].filter((id) => !ids.has(id))));
      setBusy(true);
      try {
        if (targets.length === 1 && targets[0]) await api.itemAction(targets[0].id, action);
        else {
          const r = await api.bulkAction([...ids], action);
          if (r.missing.length > 0)
            toast('warning', 'They may have been removed meanwhile; the list is reloaded.', {
              title: `${plural(r.missing.length, 'item was', 'items were')} not found`,
            });
        }
      } catch (e) {
        client.setQueryData(queryKey, before);
        setChecked(ids);
        toast('danger', (e as Error).message, {
          title: `Could not ${VERB[action]} ${plural(targets.length, 'item')}`,
        });
      } finally {
        setBusy(false);
        void client.invalidateQueries({ queryKey: keys.allItems });
        void client.invalidateQueries({ queryKey: keys.repos });
      }
    },
    [client, queryKey, query, cursor, panel, toast],
  );

  const runOne = useCallback((item: Item, action: ItemAction) => void run([item], action), [run]);

  const runChecked = async (action: ItemAction) => {
    const targets = list.filter((i) => checked.has(i.id) && appliesTo(i, action));
    if (targets.length === 0) return;
    if (targets.length > CONFIRM_OVER) {
      const verb = { done: 'Mark', mute: 'Mute', restore: 'Restore' }[action];
      const ok = await confirm({
        title: `${verb} ${targets.length} items${action === 'done' ? ' done' : ''}?`,
        text:
          action === 'restore'
            ? 'They come back into the views that match them.'
            : 'They leave the views that show open work. The Hidden view shows them, and restores them.',
        confirmLabel: `${verb} ${targets.length}`,
      });
      if (!ok) return;
    }
    await run(targets, action);
  };

  /** e, m, u: the checked items when there are any, else the row under the cursor. */
  const act = (action: ItemAction) => {
    if (checked.size > 0) void runChecked(action);
    else if (current && appliesTo(current, action)) runOne(current, action);
  };
  const move = (delta: number) => {
    if (!list.length) return;
    const at = Math.max(
      0,
      list.findIndex((i) => i.id === cursor),
    );
    const next = list[Math.min(list.length - 1, Math.max(0, at + delta))];
    if (!next) return;
    setCursor(next.id);
    document
      .querySelector<HTMLElement>(`[data-item-id="${CSS.escape(next.id)}"]`)
      ?.closest('li')
      ?.scrollIntoView({ block: 'nearest' });
  };
  const openCurrent = () => current && window.open(current.url, '_blank', 'noopener');
  const openDetails = useCallback((id: string) => setPanel({ id, open: true }), []);

  const group = 'Items';
  useHotkey({ id: 'down', keys: 'J', label: 'Next item', group, run: () => move(1) });
  useHotkey({ id: 'up', keys: 'K', label: 'Previous item', group, run: () => move(-1) });
  useHotkey({ id: 'open', keys: 'O', label: 'Open the item on GitHub', group, run: openCurrent });
  useHotkey({
    id: 'details',
    keys: 'X',
    label: 'Show the details of the item',
    group,
    run: () => current && openDetails(current.id),
  });
  useHotkey({
    id: 'done',
    keys: 'E',
    label: 'Mark done (the selected items, else the current one)',
    group,
    run: () => act('done'),
  });
  useHotkey({
    id: 'mute',
    keys: 'M',
    label: 'Mute (the selected items, else the current one)',
    group,
    run: () => act('mute'),
  });
  useHotkey({
    id: 'restore',
    keys: 'U',
    label: 'Restore (the selected items, else the current one)',
    group,
    run: () => act('restore'),
  });
  const sel = 'Selection';
  useHotkey({
    id: 'select',
    keys: 'S',
    label: 'Select or unselect the item',
    group: sel,
    run: () => current && toggleCheck(current.id, false),
  });
  useHotkey({
    id: 'select-range',
    keys: 'Shift+S',
    label: 'Select up to the item',
    group: sel,
    run: () => current && toggleCheck(current.id, true),
  });
  useHotkey({
    id: 'select-all',
    keys: 'Shift+A',
    label: 'Select all items, or none',
    group: sel,
    run: toggleAll,
  });
  useHotkey({
    id: 'select-clear',
    keys: 'Escape',
    label: 'Clear the selection',
    group: sel,
    when: checked.size > 0,
    run: () => setChecked(new Set()),
  });
  useHotkey({
    id: 'filter',
    keys: '/',
    label: 'Go to the filter field',
    group: 'App',
    run: () => document.getElementById(fieldId)?.focus(),
  });

  const labels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of list) for (const l of item.labels) counts.set(l, (counts.get(l) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [list]);
  const options = useMemo(() => tokenOptions({ repos, labels }), [repos, labels]);
  const tokens = tokenize(query);
  // The field keeps the tokens it does not offer (free text, a date typed by hand) as its own choices, read
  // when it starts: a new one from elsewhere (the address, a view) starts it again.
  const ownTokens = tokens.filter((t) => !options.some((o) => o.value === t)).join(' ');
  const unknown = parseSearch(query).unknown;

  const updated = qualifierValues(query, 'updated')[0] ?? 'any';
  const facet = (token: string, label: string): MenuCheckboxItem => ({
    type: 'checkbox',
    id: token,
    label,
    checked: hasToken(query, token),
    onCheckedChange: () => setQuery(toggleToken(query, token)),
  });
  const filters: MenuItem[] = [
    { type: 'group', label: 'Type', items: TYPE_FACETS.map(([t, l]) => facet(t, l)) },
    { type: 'group', label: 'State', items: STATE_FACETS.map(([t, l]) => facet(t, l)) },
    {
      type: 'group',
      label: 'Your role',
      items: (Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) =>
        facet(`role:${r}`, ROLE_LABELS[r]),
      ),
    },
    {
      type: 'radio-group',
      label: 'Activity',
      value: ACTIVITY_FACETS.some(([v]) => v === updated) ? updated : '',
      onValueChange: (v) => setQuery(setSingleQualifier(query, 'updated', v === 'any' ? null : v)),
      options: ACTIVITY_FACETS.map(([value, label]) => ({ value, label })),
    },
  ];

  if (viewId && viewsLoaded && !view) return <NotFoundPage />;

  const title = view?.name ?? 'Search';
  const n = checked.size;
  const picked = list.filter((i) => checked.has(i.id));
  const noToken =
    status !== null && status.githubLogin === null && status.nextSyncAt === null && status.itemCount === 0;

  const empty = noToken ? (
    <EmptyState
      icon={<Icon name="bi:key" />}
      title="Connect a GitHub token"
      text={
        <>
          Octotally reads what involves you through the GitHub API. Create a{' '}
          <AppLink
            to="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            fine-grained personal access token
          </AppLink>{' '}
          with read-only access to Issues, Pull requests, Discussions and Metadata, set it as GITHUB_TOKEN and
          restart the server.
        </>
      }
    />
  ) : query.trim() && status && status.itemCount > 0 ? (
    <EmptyState
      icon={<Icon name="bi:search" />}
      title="No items match"
      text="Remove a filter, or widen the activity window."
      actions={
        view ? undefined : (
          <Button variant="primary" onClick={() => setQuery('')}>
            Clear filters
          </Button>
        )
      }
    />
  ) : (
    <EmptyState
      icon={<Icon name="bi:check-circle" />}
      title="Nothing needs you"
      text={
        status?.nextSyncAt ? (
          <>
            The next check is <RelativeTime date={status.nextSyncAt} />.
          </>
        ) : (
          'Waiting for the next sync.'
        )
      }
    />
  );

  const actions =
    view && !view.builtin ? (
      <Button icon={<Icon name="bi:pencil" />} onClick={() => setDialog({ mode: 'edit', view })}>
        Edit view
      </Button>
    ) : !view && query.trim() ? (
      <Button icon={<Icon name="bi:bookmark-plus" />} onClick={() => setDialog({ mode: 'create' })}>
        Save as view
      </Button>
    ) : undefined;

  return (
    <Page
      title={title}
      description={items.data ? plural(items.data.total, 'item') : undefined}
      actions={actions}
    >
      <Stack gap="4">
        {status?.lastError ? (
          <Alert
            tone="danger"
            title="The last sync failed"
            actions={
              <Button size="sm" onClick={() => void refresh()}>
                Try again
              </Button>
            }
          >
            {status.lastError}
          </Alert>
        ) : null}
        <Field
          label="Filter"
          help="Pick or type a filter: is:open, type:pr, repo:owner/name, label:bug, updated:>7d, -author:@me, or any word."
        >
          <MultiSelect
            key={ownTokens}
            id={fieldId}
            options={options}
            value={tokens}
            onValueChange={(tokens) => setQuery(joinTokens(tokens))}
            allowCustom
            placeholder="Filter or search"
          />
        </Field>
        {unknown.length > 0 ? (
          <Alert tone="warning">
            {unknown.length === 1 ? 'This filter is not understood' : 'These filters are not understood'}:{' '}
            {unknown.join(', ')}
          </Alert>
        ) : null}
        <Toolbar
          start={
            <>
              <Check
                label={n > 0 ? `${n} of ${list.length} selected` : 'Select all'}
                checked={n > 0 && n === list.length}
                indeterminate={n > 0 && n < list.length}
                disabled={list.length === 0}
                onCheckedChange={toggleAll}
              />
              {n > 0 ? (
                <>
                  {picked.some((i) => i.hidden === 'none') ? (
                    <>
                      <Button
                        size="sm"
                        icon={<Icon name="bi:check2" />}
                        loading={busy}
                        onClick={() => void runChecked('done')}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        icon={<Icon name="bi:bell-slash" />}
                        loading={busy}
                        onClick={() => void runChecked('mute')}
                      >
                        Mute
                      </Button>
                    </>
                  ) : null}
                  {picked.some((i) => i.hidden !== 'none') ? (
                    <Button
                      size="sm"
                      icon={<Icon name="bi:arrow-counterclockwise" />}
                      loading={busy}
                      onClick={() => void runChecked('restore')}
                    >
                      Restore
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
                    Clear selection
                  </Button>
                </>
              ) : null}
            </>
          }
          end={
            <>
              <Menu
                label="Filters"
                align="end"
                items={filters}
                trigger={
                  <Button size="sm" icon={<Icon name="bi:funnel" />}>
                    Filters
                  </Button>
                }
              />
              {!view && query.trim() ? (
                <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                  Clear filters
                </Button>
              ) : null}
            </>
          }
        />
        <QueryView
          query={{ ...items, status: ready ? items.status : 'pending' }}
          loading={<Skeleton lines={6} />}
          empty={empty}
          isEmpty={(data) => data.items.length === 0}
        >
          {(data) => (
            <List label={`Items of ${title}`}>
              {data.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  current={item.id === cursor}
                  checked={checked.has(item.id)}
                  onCheck={toggleCheck}
                  onDetails={openDetails}
                  onAction={runOne}
                />
              ))}
            </List>
          )}
        </QueryView>
      </Stack>
      <ItemDrawer
        item={panel?.open ? (panelItem ?? lastPanelItem.current) : null}
        onClose={() => setPanel(null)}
        onAction={runOne}
      />
      <ViewDialog
        state={dialog}
        currentQuery={query}
        onClose={() => setDialog(null)}
        onSaved={(saved: View) => {
          setDialog(null);
          void navigate({
            to: '/views/$viewId',
            params: { viewId: saved.id },
            search: ({ q: _q, ...rest }) => rest,
          });
        }}
        onDeleted={() => {
          setDialog(null);
          void navigate({ to: '/', search: (s) => ({ ...s, q: undefined }) });
        }}
      />
    </Page>
  );
}
