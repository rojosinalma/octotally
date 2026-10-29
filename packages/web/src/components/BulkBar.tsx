import type { Item } from '@octotally/shared';
import { useEffect, useRef } from 'react';
import { Ui } from 'tailor-react';
import type { ItemAction } from '../api';

interface Props {
  items: Item[];
  checked: ReadonlySet<string>;
  busy: boolean;
  onToggleAll: () => void;
  onAction: (action: ItemAction) => void;
  onClear: () => void;
}

/** Select-all checkbox, count and bulk actions above the list. Sticky; actions sit left, clear of toasts. */
export function BulkBar({ items, checked, busy, onToggleAll, onAction, onClear }: Props) {
  const box = useRef<HTMLInputElement>(null);
  const n = checked.size;
  const all = n > 0 && n === items.length;
  const some = n > 0 && !all;
  useEffect(() => {
    if (box.current) box.current.indeterminate = some;
  }, [some]);
  const picked = items.filter((i) => checked.has(i.id));
  const anyVisible = picked.some((i) => i.hidden === 'none');
  const anyHidden = picked.some((i) => i.hidden !== 'none');
  const label = (word: string) => `${word} ${n === 1 ? 'item' : `${n} items`}`;

  return (
    <div className="bulk-bar t-small" data-active={n > 0 ? '' : undefined}>
      <label className="item-check" data-tip={all ? 'Unselect all' : 'Select all (Shift+A)'}>
        <input
          ref={box}
          type="checkbox"
          className="t-check-input"
          checked={all}
          disabled={items.length === 0}
          onChange={onToggleAll}
        />
        <span className="t-visually-hidden">{all ? 'Unselect all items' : 'Select all items'}</span>
      </label>
      <span className="t-muted" aria-live="polite">
        {n > 0
          ? `${n} of ${items.length} selected`
          : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      </span>
      {n > 0 && (
        <span className="bulk-actions" aria-busy={busy || undefined}>
          {anyVisible && (
            <>
              <Ui.Button
                size="xs"
                disabled={busy}
                tip={`${label('Mark done')} (e)`}
                onClick={() => onAction('done')}
              >
                <Ui.Icon name="bi-check2" /> Done
              </Ui.Button>
              <Ui.Button
                size="xs"
                disabled={busy}
                tip={`${label('Mute')} until new activity (m)`}
                onClick={() => onAction('mute')}
              >
                <Ui.Icon name="bi-bell-slash" /> Mute
              </Ui.Button>
            </>
          )}
          {anyHidden && (
            <Ui.Button
              size="xs"
              disabled={busy}
              tip={`${label('Restore')} (u)`}
              onClick={() => onAction('restore')}
            >
              <Ui.Icon name="lucide-history" /> Restore
            </Ui.Button>
          )}
          <Ui.Button size="xs" variant="ghost" disabled={busy} tip="Clear selection (Esc)" onClick={onClear}>
            Clear
          </Ui.Button>
          {busy && <Ui.Spinner size="sm" label="Working" />}
        </span>
      )}
    </div>
  );
}
