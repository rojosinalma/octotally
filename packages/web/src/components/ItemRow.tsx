import type { Item } from '@octotally/shared';
import { memo } from 'react';
import { Ui } from 'tailor-react';
import type { ItemAction } from '../api';
import { needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';
import { absoluteTime, activityLine } from '../lib/format';

interface Props {
  item: Item;
  selected: boolean;
  checked: boolean;
  onCheck: (shift: boolean) => void;
  onSelect: () => void;
  onOpenPanel: () => void;
  onAction: (action: ItemAction) => void;
}

export const ItemRow = memo(function ItemRow({
  item,
  selected,
  checked,
  onCheck,
  onSelect,
  onOpenPanel,
  onAction,
}: Props) {
  const visual = stateVisual(item);
  const hidden = item.hidden !== 'none';
  const needs = needsPr(item);
  const [owner, name] = item.repo.split('/');

  return (
    <li
      className="item-row"
      aria-current={selected ? 'true' : undefined}
      data-hidden={hidden ? '' : undefined}
      data-checked={checked ? '' : undefined}
      data-item-id={item.id}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button, label, input')) return;
        onSelect();
        onOpenPanel();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenPanel();
        }
      }}
      onFocus={onSelect}
      tabIndex={selected ? 0 : -1}
    >
      <label className="item-check" data-tip={checked ? 'Unselect' : 'Select (shift: range)'}>
        <input
          type="checkbox"
          className="t-check-input"
          checked={checked}
          tabIndex={-1}
          onChange={() => undefined}
          onClick={(e) => {
            e.stopPropagation();
            onCheck(e.shiftKey);
          }}
        />
        <span className="t-visually-hidden">Select {item.title}</span>
      </label>
      <span className="item-icon t-tone-text" data-tone={visual.tone} data-tip={visual.label}>
        <Ui.Icon name={visual.icon} label={visual.label} />
      </span>
      <div className="item-main">
        <div className="item-title-line">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="item-title"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>
          {item.labels.map((label) => (
            <Ui.Badge key={label} size="xs" variant="outline">
              {label}
            </Ui.Badge>
          ))}
        </div>
        <div className="item-meta t-small t-muted">
          <span className="item-repo">
            <span className="t-muted">{owner}/</span>
            {name} <span className="t-muted">#{item.number}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span data-tip={absoluteTime(item.lastActivityAt)}>{activityLine(item)}</span>
          {item.roles.map((role) => (
            <Ui.Badge key={role} size="xs" tone={role === 'author' ? 'accent' : 'neutral'}>
              {ROLE_LABELS[role]}
            </Ui.Badge>
          ))}
          {hidden && (
            <Ui.Badge size="xs" tone={item.hidden === 'done' ? 'purple' : 'warning'}>
              {item.hidden === 'done' ? 'Done' : 'Muted'}
            </Ui.Badge>
          )}
        </div>
      </div>
      <div className="item-side t-small t-muted">
        {needs && item.type === 'issue' && (
          <Ui.Badge tone="warning" size="xs" data-tip="Open issue without a linked pull request">
            Needs PR
          </Ui.Badge>
        )}
        {needs && item.type === 'discussion' && (
          <Ui.Badge tone="warning" size="xs" data-tip="Open discussion without an accepted answer">
            Unanswered
          </Ui.Badge>
        )}
        {item.linkedPrs.length > 0 && (
          <span className="item-count" data-tip={`${item.linkedPrs.length} linked pull request(s)`}>
            <Ui.Icon name="lucide-git-pull-request" /> {item.linkedPrs.length}
          </span>
        )}
        {item.commentCount > 0 && (
          <span className="item-count" data-tip={`${item.commentCount} comments`}>
            <Ui.Icon name="lucide-message-square" /> {item.commentCount}
          </span>
        )}
        <span className="item-actions">
          {hidden ? (
            <RowAction icon="lucide-history" label="Restore" kbd="u" onClick={() => onAction('restore')} />
          ) : (
            <>
              <RowAction
                icon="bi-bell-slash"
                label="Mute until new activity"
                kbd="m"
                onClick={() => onAction('mute')}
              />
              <RowAction icon="bi-check2" label="Mark done" kbd="e" onClick={() => onAction('done')} />
            </>
          )}
          <RowAction
            icon="bi-box-arrow-up-right"
            label="Open on GitHub"
            kbd="o"
            onClick={() => window.open(item.url, '_blank', 'noopener')}
          />
        </span>
      </div>
    </li>
  );
});

function RowAction({
  icon,
  label,
  kbd,
  onClick,
}: {
  icon: string;
  label: string;
  kbd: string;
  onClick: () => void;
}) {
  return (
    <Ui.Button
      variant="ghost"
      size="xs"
      iconOnly
      aria-label={label}
      tip={`${label} (${kbd})`}
      onClick={onClick}
    >
      <Ui.Icon name={icon} />
    </Ui.Button>
  );
}
