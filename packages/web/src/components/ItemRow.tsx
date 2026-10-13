import type { Item } from '@octotally/shared';
import {
  BellSlashIcon,
  CheckIcon,
  CommentIcon,
  GitPullRequestIcon,
  HistoryIcon,
  LinkExternalIcon,
} from '@primer/octicons-react';
import { IconButton, Label, Link } from '@primer/react';
import { memo } from 'react';
import type { ItemAction } from '../api';
import { cssVar, needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';
import { absoluteTime, activityLine } from '../lib/format';

interface Props {
  item: Item;
  selected: boolean;
  onSelect: () => void;
  onOpenPanel: () => void;
  onAction: (action: ItemAction) => void;
}

export const ItemRow = memo(function ItemRow({ item, selected, onSelect, onOpenPanel, onAction }: Props) {
  const visual = stateVisual(item);
  const Icon = visual.icon;
  const hidden = item.hidden !== 'none';
  const needs = needsPr(item);
  const [owner, name] = item.repo.split('/');

  return (
    <li
      className={`item-row${selected ? ' item-row-selected' : ''}${hidden ? ' item-row-hidden' : ''}`}
      aria-current={selected ? 'true' : undefined}
      data-item-id={item.id}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
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
      <span className="item-icon" style={{ color: cssVar(visual.color) }} title={visual.label}>
        <Icon aria-label={visual.label} size={16} />
      </span>
      <div className="item-main">
        <div className="item-title-line">
          <Link
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="item-title"
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </Link>
          {item.labels.map((label) => (
            <Label key={label} size="small" variant="secondary" className="item-label">
              {label}
            </Label>
          ))}
        </div>
        <div className="item-meta">
          <span className="item-repo">
            <span className="fg-muted">{owner}/</span>
            {name} <span className="fg-muted">#{item.number}</span>
          </span>
          <span className="item-sep">·</span>
          <span title={absoluteTime(item.lastActivityAt)}>{activityLine(item)}</span>
          {item.roles.map((role) => (
            <Label
              key={role}
              size="small"
              variant={role === 'author' ? 'accent' : 'default'}
              className="item-role"
            >
              {ROLE_LABELS[role]}
            </Label>
          ))}
          {hidden && (
            <Label size="small" variant={item.hidden === 'done' ? 'done' : 'attention'}>
              {item.hidden === 'done' ? 'Done' : 'Muted'}
            </Label>
          )}
        </div>
      </div>
      <div className="item-side">
        {needs && item.type === 'issue' && (
          <Label variant="attention" size="small" title="Open issue without a linked pull request">
            Needs PR
          </Label>
        )}
        {needs && item.type === 'discussion' && (
          <Label variant="attention" size="small" title="Open discussion without an accepted answer">
            Unanswered
          </Label>
        )}
        {item.linkedPrs.length > 0 && (
          <span className="item-count" title={`${item.linkedPrs.length} linked pull request(s)`}>
            <GitPullRequestIcon size={16} /> {item.linkedPrs.length}
          </span>
        )}
        {item.commentCount > 0 && (
          <span className="item-count" title={`${item.commentCount} comments`}>
            <CommentIcon size={16} /> {item.commentCount}
          </span>
        )}
        <span className="item-actions">
          {hidden ? (
            <IconButton
              icon={HistoryIcon}
              aria-label="Restore"
              size="small"
              variant="invisible"
              keybindingHint="u"
              onClick={() => onAction('restore')}
            />
          ) : (
            <>
              <IconButton
                icon={BellSlashIcon}
                aria-label="Mute until new activity"
                size="small"
                variant="invisible"
                keybindingHint="m"
                onClick={() => onAction('mute')}
              />
              <IconButton
                icon={CheckIcon}
                aria-label="Mark done"
                size="small"
                variant="invisible"
                keybindingHint="e"
                onClick={() => onAction('done')}
              />
            </>
          )}
          <IconButton
            icon={LinkExternalIcon}
            aria-label="Open on GitHub"
            size="small"
            variant="invisible"
            keybindingHint="o"
            onClick={() => window.open(item.url, '_blank', 'noopener')}
          />
        </span>
      </div>
    </li>
  );
});
