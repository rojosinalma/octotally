import type { Item, SyncStatus } from '@octotally/shared';
import { useEffect, useRef } from 'react';
import { Ui } from 'tailor-react';
import type { ApiError, ItemAction } from '../api';
import { EmptyState } from './EmptyState';
import { ItemRow } from './ItemRow';

interface Props {
  items: Item[] | null;
  loading: boolean;
  error: ApiError | null;
  status: SyncStatus | null;
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenPanel: (id: string) => void;
  onAction: (item: Item, action: ItemAction) => void;
  onClear: () => void;
  onRetry: () => void;
}

function Loading() {
  return (
    <Ui.Card className="item-list-loading" aria-busy="true">
      <Ui.EmptyState size="sm" icon={<Ui.Spinner size="lg" label="Loading items" />}>
        <p>Loading items…</p>
      </Ui.EmptyState>
    </Ui.Card>
  );
}

export function ItemList({
  items,
  loading,
  error,
  status,
  query,
  selectedId,
  onSelect,
  onOpenPanel,
  onAction,
  onClear,
  onRetry,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the selected row in view when moving with j/k.
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  if (items === null && loading) return <Loading />;
  if (error && !items) return <EmptyState kind="error" message={error.message} onRetry={onRetry} />;
  if (!items || items.length === 0) {
    // No login, no scheduled sync and nothing stored: the server has no usable GITHUB_TOKEN.
    const noToken =
      status !== null && status.githubLogin === null && status.nextSyncAt === null && status.itemCount === 0;
    if (noToken) return <EmptyState kind="no-token" status={status} />;
    if (query.trim() && status && status.itemCount > 0)
      return <EmptyState kind="no-results" onClear={onClear} />;
    return <EmptyState kind="nothing" status={status} />;
  }

  return (
    <ul
      ref={listRef}
      className={`t-card item-list${loading ? ' item-list-refreshing' : ''}`}
      aria-label="Items"
      aria-busy={loading || undefined}
    >
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => onSelect(item.id)}
          onOpenPanel={() => onOpenPanel(item.id)}
          onAction={(action) => onAction(item, action)}
        />
      ))}
    </ul>
  );
}
