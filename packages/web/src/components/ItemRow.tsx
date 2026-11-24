import type { Item } from '@octotally/shared';
import { Fragment, type MouseEvent, memo, type ReactElement } from 'react';
import {
  Badge,
  Button,
  Check,
  Icon,
  ListItem,
  Menu,
  type MenuItem,
  RelativeTime,
  Tooltip,
  Truncate,
} from 'tailor/core';
import { AppLink } from 'tailor/kit/link';
import type { ItemAction } from '../api';
import { useMedia } from '../hooks/useMedia';
import { needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';

export interface RowHandlers {
  onCheck: (id: string, range: boolean) => void;
  onDetails: (id: string) => void;
  onAction: (item: Item, action: ItemAction) => void;
}

interface Props extends RowHandlers {
  item: Item;
  /** The keyboard cursor (j/k) is on this row. */
  current: boolean;
  checked: boolean;
}

const openOnGitHub = (item: Item) => window.open(item.url, '_blank', 'noopener');

/** One issue, pull request or discussion: box, state, title, where and when, and its actions. */
const KINDS: Record<Item['type'], string> = { issue: 'Issue', pr: 'Pull request', discussion: 'Discussion' };

/** A pointer and room to spare: the row shows its main action as a button beside the menu. */
const QUICK_MEDIA = '(pointer: fine) and (min-width: 40rem)';

export const ItemRow = memo(function ItemRow({
  item,
  current,
  checked,
  onCheck,
  onDetails,
  onAction,
}: Props) {
  const visual = stateVisual(item);
  const quickShown = useMedia(QUICK_MEDIA);
  const hidden = item.hidden !== 'none';
  const needs = needsPr(item);
  let shift = false;
  const noteShift = (e: MouseEvent) => {
    shift = e.shiftKey;
  };

  const menu: MenuItem[] = [
    {
      id: 'details',
      label: 'Details',
      icon: <Icon name="bi:info-circle" />,
      shortcut: 'X',
      onSelect: () => onDetails(item.id),
    },
    {
      id: 'open',
      label: 'Open on GitHub',
      icon: <Icon name="bi:box-arrow-up-right" />,
      shortcut: 'O',
      onSelect: () => openOnGitHub(item),
    },
    { type: 'separator' },
    ...(hidden
      ? [
          {
            id: 'restore',
            label: 'Restore',
            icon: <Icon name="bi:arrow-counterclockwise" />,
            shortcut: 'U',
            onSelect: () => onAction(item, 'restore'),
          },
        ]
      : [
          {
            id: 'done',
            label: 'Mark done',
            icon: <Icon name="bi:check2" />,
            shortcut: 'E',
            onSelect: () => onAction(item, 'done'),
          },
          {
            id: 'mute',
            label: 'Mute until new activity',
            icon: <Icon name="bi:bell-slash" />,
            shortcut: 'M',
            onSelect: () => onAction(item, 'mute'),
          },
        ]),
  ];

  const quick = hidden
    ? { action: 'restore' as const, label: 'Restore', icon: 'bi:arrow-counterclockwise' as const }
    : { action: 'done' as const, label: 'Mark done', icon: 'bi:check2' as const };

  // Inline in the description, one space apart: the line wraps between them.
  const badges: ReactElement[] = [
    ...item.roles.map((role) => (
      <Badge key={`role-${role}`} tone={role === 'author' ? 'accent' : 'neutral'}>
        {ROLE_LABELS[role]}
      </Badge>
    )),
    ...(hidden
      ? [
          <Badge key="hidden" tone={item.hidden === 'done' ? 'accent' : 'warning'}>
            {item.hidden === 'done' ? 'Done' : 'Muted'}
          </Badge>,
        ]
      : []),
    ...(needs
      ? [
          <Badge key="needs" tone="warning">
            {item.type === 'discussion' ? 'Unanswered' : 'Needs PR'}
          </Badge>,
        ]
      : []),
    ...item.labels.map((label) => (
      <Badge key={`label-${label}`} variant="outline">
        {label}
      </Badge>
    )),
    ...(item.linkedPrs.length > 0
      ? [
          <Badge key="prs" icon={<Icon name="bi:file-diff" label="Linked pull requests" />}>
            {item.linkedPrs.length}
          </Badge>,
        ]
      : []),
    ...(item.commentCount > 0
      ? [
          <Badge key="comments" icon={<Icon name="bi:chat" label="Comments" />}>
            {item.commentCount}
          </Badge>,
        ]
      : []),
  ];

  return (
    <ListItem
      selected={current}
      leading={
        <span onClickCapture={noteShift}>
          <Check
            label={<span className="t-sr-only">Select {item.title}</span>}
            checked={checked}
            onCheckedChange={() => onCheck(item.id, shift)}
          />
        </span>
      }
      title={
        <Truncate lines="2">
          <AppLink to={item.url} target="_blank" rel="noreferrer" data-item-id={item.id}>
            {item.title}
          </AppLink>
        </Truncate>
      }
      description={
        <>
          <Badge tone={visual.tone} icon={<Icon name={visual.icon} label={KINDS[item.type]} />}>
            {visual.word}
          </Badge>{' '}
          · {item.repo} #{item.number} ·{' '}
          {item.lastActivityBy
            ? `${item.lastActivityBy} ${item.commentCount > 0 ? 'commented' : 'opened'} `
            : 'updated '}
          <RelativeTime date={item.lastActivityAt} />
          {badges.map((badge) => (
            <Fragment key={badge.key}> {badge}</Fragment>
          ))}
        </>
      }
      trailing={
        <>
          {quickShown ? (
            <Tooltip text={quick.label}>
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon name={quick.icon} />}
                label={quick.label}
                onClick={() => onAction(item, quick.action)}
              />
            </Tooltip>
          ) : null}
          <Menu
            label={`Actions for ${item.title}`}
            align="end"
            items={menu}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon name="bi:three-dots" />}
                label={`Actions for ${item.title}`}
              />
            }
          />
        </>
      }
    />
  );
});
