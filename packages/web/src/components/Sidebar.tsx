import { type Item, substituteSettings, type View } from '@octotally/shared';
import { PencilIcon, PlusIcon } from '@primer/octicons-react';
import { ActionList, Button, CounterLabel, Dialog, FormControl, NavList, TextInput } from '@primer/react';
import { type MouseEvent, useMemo, useState } from 'react';
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
        toast(`View "${name.trim()}" saved`);
      } else {
        await api.updateView(dialog.view.id, { name: name.trim(), query: viewQuery.trim() });
        toast('View updated');
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
    setBusy(true);
    try {
      await api.deleteView(view.id);
      await reloadViews();
      toast(`View "${view.name}" deleted`);
      setDialog(null);
    } catch (e) {
      toast('Could not delete view', { description: (e as Error).message, variant: 'critical' });
    } finally {
      setBusy(false);
    }
  };

  const viewItem = (view: View) => (
    <NavList.Item
      key={view.id}
      href={`/?q=${encodeURIComponent(resolve(view))}`}
      aria-current={activeViewId === view.id ? 'page' : undefined}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        onQuery(resolve(view));
      }}
    >
      {view.name}
      <NavList.TrailingVisual>
        {viewCounts[view.id] !== undefined && <CounterLabel>{viewCounts[view.id]}</CounterLabel>}
      </NavList.TrailingVisual>
      {!view.builtin && (
        <NavList.TrailingAction
          icon={PencilIcon}
          label={`Edit view ${view.name}`}
          onClick={() => openEdit(view)}
        />
      )}
    </NavList.Item>
  );

  return (
    <aside className="sidebar" aria-label="Views and filters">
      <NavList aria-label="Views" className="sidebar-nav">
        <NavList.Group title="Views">
          {builtin.map(viewItem)}
          {custom.map(viewItem)}
        </NavList.Group>
      </NavList>
      <div className="sidebar-action">
        <Button
          size="small"
          variant="invisible"
          leadingVisual={PlusIcon}
          onClick={openCreate}
          disabled={!query.trim()}
        >
          Save current search as view
        </Button>
      </div>

      <h2 className="sidebar-heading">Filters</h2>
      <div className="facet">
        <h3 className="facet-heading" id="facet-type">
          Type
        </h3>
        <ActionList role="listbox" selectionVariant="multiple" aria-labelledby="facet-type">
          {TYPE_FACETS.map(([token, label]) => (
            <ActionList.Item
              key={token}
              selected={hasToken(query, token)}
              onSelect={() => onQuery(toggleToken(query, token))}
            >
              {label}
            </ActionList.Item>
          ))}
        </ActionList>
      </div>
      <div className="facet">
        <h3 className="facet-heading" id="facet-state">
          State
        </h3>
        <ActionList role="listbox" selectionVariant="multiple" aria-labelledby="facet-state">
          {STATE_FACETS.map(([token, label]) => (
            <ActionList.Item
              key={token}
              selected={hasToken(query, token)}
              onSelect={() => onQuery(toggleToken(query, token))}
            >
              {label}
            </ActionList.Item>
          ))}
          <ActionList.Item
            selected={hasToken(query, '-linked:pr')}
            onSelect={() => onQuery(toggleToken(query, '-linked:pr'))}
          >
            Needs PR
          </ActionList.Item>
        </ActionList>
      </div>
      <div className="facet">
        <h3 className="facet-heading" id="facet-role">
          Role
        </h3>
        <ActionList role="listbox" selectionVariant="multiple" aria-labelledby="facet-role">
          {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((role) => {
            const token = `role:${role}`;
            return (
              <ActionList.Item
                key={role}
                selected={hasToken(query, token)}
                onSelect={() => onQuery(toggleToken(query, token))}
              >
                {ROLE_LABELS[role]}
              </ActionList.Item>
            );
          })}
        </ActionList>
      </div>
      <div className="facet">
        <h3 className="facet-heading" id="facet-activity">
          Activity
        </h3>
        <ActionList role="listbox" selectionVariant="single" aria-labelledby="facet-activity">
          {ACTIVITY_FACETS.map(([value, label]) => (
            <ActionList.Item
              key={value}
              selected={activeUpdated === value}
              onSelect={() =>
                onQuery(setSingleQualifier(query, 'updated', activeUpdated === value ? null : value))
              }
            >
              {label}
            </ActionList.Item>
          ))}
          <ActionList.Item
            selected={activeUpdated === null}
            onSelect={() => onQuery(setSingleQualifier(query, 'updated', null))}
          >
            Any time
          </ActionList.Item>
        </ActionList>
      </div>
      <div className="facet">
        <h3 className="facet-heading">Repository</h3>
        {repos.length > REPO_LIMIT && (
          <TextInput
            size="small"
            block
            aria-label="Filter repositories"
            placeholder="Filter repositories"
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            className="facet-filter"
          />
        )}
        <ActionList role="listbox" selectionVariant="multiple" aria-label="Repository">
          {visibleRepos.map(({ repo, count }) => {
            const token = `repo:${repo}`;
            return (
              <ActionList.Item
                key={repo}
                selected={hasToken(query, token)}
                onSelect={() => onQuery(toggleToken(query, token))}
              >
                <span className="facet-label" title={repo}>
                  {repo}
                </span>
                <ActionList.TrailingVisual>
                  <CounterLabel>{count}</CounterLabel>
                </ActionList.TrailingVisual>
              </ActionList.Item>
            );
          })}
          {visibleRepos.length === 0 && <ActionList.Item disabled>No repositories</ActionList.Item>}
        </ActionList>
        {!repoFilter && filteredRepos.length > REPO_LIMIT && (
          <Button variant="invisible" size="small" onClick={() => setShowAllRepos((s) => !s)}>
            {showAllRepos ? 'Show fewer' : `Show all ${filteredRepos.length}`}
          </Button>
        )}
      </div>
      {labels.length > 0 && (
        <div className="facet">
          <h3 className="facet-heading">Labels</h3>
          <ActionList role="listbox" selectionVariant="multiple" aria-label="Labels">
            {visibleLabels.map(([label, count]) => {
              const token = `label:${label}`;
              return (
                <ActionList.Item
                  key={label}
                  selected={hasToken(query, token)}
                  onSelect={() => onQuery(toggleToken(query, token))}
                >
                  <span className="facet-label" title={label}>
                    {label}
                  </span>
                  <ActionList.TrailingVisual>
                    <CounterLabel>{count}</CounterLabel>
                  </ActionList.TrailingVisual>
                </ActionList.Item>
              );
            })}
          </ActionList>
          {labels.length > LABEL_LIMIT && (
            <Button variant="invisible" size="small" onClick={() => setShowAllLabels((s) => !s)}>
              {showAllLabels ? 'Show fewer' : `Show all ${labels.length}`}
            </Button>
          )}
        </div>
      )}

      {dialog && (
        <Dialog
          title={dialog.mode === 'create' ? 'Save view' : 'Edit view'}
          onClose={() => setDialog(null)}
          width="large"
          footerButtons={[
            ...(dialog.mode === 'edit'
              ? [
                  {
                    content: 'Delete',
                    buttonType: 'danger' as const,
                    onClick: () => void remove(dialog.view),
                    disabled: busy,
                  },
                ]
              : []),
            { content: 'Cancel', onClick: () => setDialog(null) },
            {
              content: 'Save',
              buttonType: 'primary',
              onClick: () => void submitDialog(),
              disabled: busy || !name.trim(),
            },
          ]}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void submitDialog();
            }}
          >
            <FormControl required>
              <FormControl.Label>Name</FormControl.Label>
              <TextInput block value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </FormControl>
            <FormControl>
              <FormControl.Label>Search</FormControl.Label>
              <TextInput block monospace value={viewQuery} onChange={(e) => setViewQuery(e.target.value)} />
              <FormControl.Caption>
                {dialog.mode === 'edit' && viewQuery !== query && (
                  <Button variant="link" size="small" onClick={() => setViewQuery(query)}>
                    Use the current search
                  </Button>
                )}
                {(dialog.mode === 'create' || viewQuery === query) &&
                  'Qualifiers like is:open repo:owner/name label:bug.'}
              </FormControl.Caption>
            </FormControl>
          </form>
        </Dialog>
      )}
    </aside>
  );
}
