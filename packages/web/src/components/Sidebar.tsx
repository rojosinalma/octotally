import { type Item, substituteSettings, type View } from '@octotally/shared';
import { type MouseEvent, useMemo, useState } from 'react';
import { Ui, useConfirm } from 'tailor-react';
import { api } from '../api';
import { useApp } from '../hooks/useApp';
import { useToast } from '../hooks/useToast';
import { ROLE_LABELS } from '../lib/colors';
import { hasToken, qualifierValues, setSingleQualifier, toggleToken } from '../lib/search';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  /** Id of the view whose query equals the current one, if any. */
  activeViewId: string | null;
  viewCounts: Record<string, number | undefined>;
  repos: { repo: string; count: number }[];
  items: Item[];
}

const TYPE_FACETS = [
  ['is:discussion', 'Discussions'],
  ['is:issue', 'Issues'],
  ['is:pr', 'Pull requests'],
] as const;
const STATE_FACETS = [
  ['is:open', 'Open'],
  ['is:closed', 'Closed'],
  ['is:merged', 'Merged'],
  ['is:draft', 'Draft'],
] as const;
const ACTIVITY_FACETS = [
  ['>7d', 'Last 7 days'],
  ['>30d', 'Last 30 days'],
  ['>90d', 'Last 90 days'],
] as const;
const REPO_LIMIT = 8;
const LABEL_LIMIT = 10;

export function Sidebar({ query, onQuery, activeViewId, viewCounts, repos, items }: Props) {
  const { views, reloadViews, settings } = useApp();
  const { toast } = useToast();
  const confirm = useConfirm();
  // Views store `{setting}` placeholders; the search bar only ever shows the resolved query.
  const resolve = (view: View) => substituteSettings(view.query, settings);
  const [repoFilter, setRepoFilter] = useState('');
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; view: View } | null>(null);
  const [name, setName] = useState('');
  const [viewQuery, setViewQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const builtin = views.filter((v) => v.builtin).sort((a, b) => a.position - b.position);
  const custom = views.filter((v) => !v.builtin).sort((a, b) => a.position - b.position);

  const labels = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const l of item.labels) counts.set(l, (counts.get(l) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const activeUpdated = qualifierValues(query, 'updated')[0] ?? null;
  const filteredRepos = repos.filter((r) => r.repo.toLowerCase().includes(repoFilter.toLowerCase()));
  const visibleRepos = showAllRepos || repoFilter ? filteredRepos : filteredRepos.slice(0, REPO_LIMIT);
  const visibleLabels = showAllLabels ? labels : labels.slice(0, LABEL_LIMIT);

  const openCreate = () => {
    setName('');
    setViewQuery(query);
    setDialog({ mode: 'create' });
  };
  const openEdit = (view: View) => {
    setName(view.name);
    setViewQuery(view.query);
    setDialog({ mode: 'edit', view });
  };
  const submitDialog = async () => {
    if (!dialog || !name.trim()) return;
    setBusy(true);
    try {
      if (dialog.mode === 'create') {
        await api.createView(name.trim(), viewQuery.trim());
      } else {
        await api.updateView(dialog.view.id, { name: name.trim(), query: viewQuery.trim() });
      }
      await reloadViews();
      setDialog(null);
    } catch (e) {
      toast('Could not save view', { description: (e as Error).message, variant: 'critical' });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (view: View) => {
    const ok = await confirm(
      `Delete view "${view.name}"?`,
      'The saved search is removed. Items are not affected.',
      {
        label: 'Delete',
      },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteView(view.id);
      await reloadViews();
      setDialog(null);
    } catch (e) {
      toast('Could not delete view', { description: (e as Error).message, variant: 'critical' });
    } finally {
      setBusy(false);
    }
  };

  const viewItem = (view: View) => {
    const count = viewCounts[view.id];
    return (
      <li key={view.id} className="view-item">
        <a
          className="t-sidebar-item"
          href={`/?q=${encodeURIComponent(resolve(view))}`}
          aria-current={activeViewId === view.id ? 'page' : undefined}
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            onQuery(resolve(view));
          }}
        >
          <span className="t-sidebar-item-name">{view.name}</span>
          {count !== undefined && <Ui.Counter>{count}</Ui.Counter>}
        </a>
        {!view.builtin && (
          <Ui.Button
            variant="ghost"
            size="xs"
            iconOnly
            className="view-edit"
            aria-label={`Edit view ${view.name}`}
            tip="Edit view"
            onClick={() => openEdit(view)}
          >
            <Ui.Icon name="bi-pencil" />
          </Ui.Button>
        )}
      </li>
    );
  };

  /** One facet option: a toggle on the query (multi-select facets AND their tokens). */
  const option = (key: string, label: string, selected: boolean, onClick: () => void, trail?: number) => (
    <Ui.List.Item
      key={key}
      selected={selected}
      onClick={onClick}
      name={<Ui.Truncate tip={label}>{label}</Ui.Truncate>}
      trail={trail !== undefined ? <Ui.Counter>{trail}</Ui.Counter> : undefined}
    />
  );

  const facet = (
    id: string,
    title: string,
    multi: boolean,
    body: React.ReactNode,
    extra?: React.ReactNode,
  ) => (
    <section className="facet" aria-labelledby={id}>
      <h3 className="facet-heading" id={id}>
        {title}
      </h3>
      {extra}
      <Ui.List size="sm" multi={multi} aria-labelledby={id}>
        {body}
      </Ui.List>
    </section>
  );

  return (
    <div className="sidebar">
      <Ui.Sidebar label="Views">
        <Ui.Sidebar.Group>Views</Ui.Sidebar.Group>
        {builtin.map(viewItem)}
        {custom.map(viewItem)}
      </Ui.Sidebar>
      <div className="sidebar-action">
        <Ui.Button size="sm" variant="ghost" onClick={openCreate} disabled={!query.trim()}>
          <Ui.Icon name="bi-plus-lg" /> Save current search as view
        </Ui.Button>
      </div>

      <h2 className="sidebar-heading">Filters</h2>
      {facet(
        'facet-type',
        'Type',
        true,
        TYPE_FACETS.map(([token, label]) =>
          option(token, label, hasToken(query, token), () => onQuery(toggleToken(query, token))),
        ),
      )}
      {facet('facet-state', 'State', true, [
        ...STATE_FACETS.map(([token, label]) =>
          option(token, label, hasToken(query, token), () => onQuery(toggleToken(query, token))),
        ),
        option('-linked:pr', 'Needs PR', hasToken(query, '-linked:pr'), () =>
          onQuery(toggleToken(query, '-linked:pr')),
        ),
      ])}
      {facet(
        'facet-role',
        'Role',
        true,
        (Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => {
          const token = `role:${role}`;
          return option(token, ROLE_LABELS[role], hasToken(query, token), () =>
            onQuery(toggleToken(query, token)),
          );
        }),
      )}
      {facet('facet-activity', 'Activity', false, [
        ...ACTIVITY_FACETS.map(([value, label]) =>
          option(value, label, activeUpdated === value, () =>
            onQuery(setSingleQualifier(query, 'updated', activeUpdated === value ? null : value)),
          ),
        ),
        option('any', 'Any time', activeUpdated === null, () =>
          onQuery(setSingleQualifier(query, 'updated', null)),
        ),
      ])}
      {facet(
        'facet-repo',
        'Repository',
        true,
        visibleRepos.length === 0 ? (
          <p className="t-small t-muted facet-empty">No repositories</p>
        ) : (
          visibleRepos.map(({ repo, count }) => {
            const token = `repo:${repo}`;
            return option(
              token,
              repo,
              hasToken(query, token),
              () => onQuery(toggleToken(query, token)),
              count,
            );
          })
        ),
        repos.length > REPO_LIMIT && (
          <Ui.Input
            size="sm"
            aria-label="Filter repositories"
            placeholder="Filter repositories"
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            className="facet-filter"
          />
        ),
      )}
      {!repoFilter && filteredRepos.length > REPO_LIMIT && (
        <Ui.Button variant="ghost" size="xs" onClick={() => setShowAllRepos((s) => !s)}>
          {showAllRepos ? 'Show fewer' : `Show all ${filteredRepos.length}`}
        </Ui.Button>
      )}
      {labels.length > 0 &&
        facet(
          'facet-labels',
          'Labels',
          true,
          visibleLabels.map(([label, count]) => {
            const token = `label:${label}`;
            return option(
              token,
              label,
              hasToken(query, token),
              () => onQuery(toggleToken(query, token)),
              count,
            );
          }),
        )}
      {labels.length > LABEL_LIMIT && (
        <Ui.Button variant="ghost" size="xs" onClick={() => setShowAllLabels((s) => !s)}>
          {showAllLabels ? 'Show fewer' : `Show all ${labels.length}`}
        </Ui.Button>
      )}

      <Ui.Dialog
        id="view-dialog"
        open={dialog !== null}
        title={dialog?.mode === 'edit' ? 'Edit view' : 'Save view'}
        onClose={() => setDialog(null)}
        footer={
          <>
            {dialog?.mode === 'edit' && (
              <Ui.Button variant="danger" onClick={() => void remove(dialog.view)} disabled={busy}>
                Delete
              </Ui.Button>
            )}
            <Ui.Button data-dialog-close="">Cancel</Ui.Button>
            <Ui.Button variant="primary" type="submit" form="view-form" busy={busy} disabled={!name.trim()}>
              Save
            </Ui.Button>
          </>
        }
      >
        {dialog && (
          <Ui.Form
            id="view-form"
            className="t-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void submitDialog();
            }}
          >
            <Ui.Field label="Name">
              <Ui.Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Ui.Field>
            <Ui.Field
              label="Search"
              hint={
                dialog.mode === 'edit' && viewQuery !== query ? (
                  <Ui.Button variant="link" size="xs" onClick={() => setViewQuery(query)}>
                    Use the current search
                  </Ui.Button>
                ) : (
                  'Qualifiers like is:open repo:owner/name label:bug.'
                )
              }
            >
              <Ui.Input className="t-mono" value={viewQuery} onChange={(e) => setViewQuery(e.target.value)} />
            </Ui.Field>
          </Ui.Form>
        )}
      </Ui.Dialog>
    </div>
  );
}
