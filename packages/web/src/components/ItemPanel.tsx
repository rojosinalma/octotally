import type { Activity, Item } from '@octotally/shared';
import {
  BellSlashIcon,
  CheckIcon,
  CommentIcon,
  GitCommitIcon,
  HistoryIcon,
  LinkExternalIcon,
  PencilIcon,
  ReplyIcon,
  TagIcon,
} from '@primer/octicons-react';
import { Dialog, Label, Link, SkeletonBox, StateLabel, Timeline } from '@primer/react';
import type { ComponentType, ReactNode } from 'react';
import { type ApiError, api, type ItemAction } from '../api';
import { useAsync } from '../hooks/useAsync';
import { cssVar, linkedPrVisual, needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';
import { absoluteTime, relativeTime } from '../lib/format';

interface Props {
  item: Item;
  onClose: () => void;
  onAction: (item: Item, action: ItemAction) => void;
}

const ACTIVITY_ICONS: Record<Activity['kind'], ComponentType<{ size?: number }>> = {
  comment: CommentIcon,
  review: CheckIcon,
  commit: GitCommitIcon,
  state: HistoryIcon,
  label: TagIcon,
  edit: PencilIcon,
  reply: ReplyIcon,
  other: HistoryIcon,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="panel-field">
      <dt className="fg-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function ItemPanel({ item, onClose, onAction }: Props) {
  const detail = useAsync(() => api.item(item.id), item.id);
  const visual = stateVisual(item);
  const hidden = item.hidden !== 'none';
  const activity = detail.data?.activity ?? null;
  const error: ApiError | null = detail.error;

  return (
    <Dialog
      title={item.title}
      subtitle={
        <span>
          {item.repo} #{item.number} · opened by {item.author} {relativeTime(item.createdAt)}
        </span>
      }
      onClose={onClose}
      position="right"
      width="xlarge"
      className="item-panel"
      footerButtons={[
        ...(hidden
          ? [{ content: 'Restore', leadingVisual: HistoryIcon, onClick: () => onAction(item, 'restore') }]
          : [
              { content: 'Mute', leadingVisual: BellSlashIcon, onClick: () => onAction(item, 'mute') },
              { content: 'Done', leadingVisual: CheckIcon, onClick: () => onAction(item, 'done') },
            ]),
        {
          content: 'Open on GitHub',
          buttonType: 'primary' as const,
          leadingVisual: LinkExternalIcon,
          onClick: () => window.open(item.url, '_blank', 'noopener'),
        },
      ]}
    >
      <div className="panel-body">
        <div className="panel-state">
          <StateLabel status={visual.status} size="small">
            {visual.label}
          </StateLabel>
          {hidden && (
            <Label variant={item.hidden === 'done' ? 'done' : 'attention'}>
              {item.hidden === 'done' ? 'Done' : 'Muted'}
            </Label>
          )}
          {needsPr(item) && (
            <Label variant="attention">{item.type === 'discussion' ? 'Unanswered' : 'Needs PR'}</Label>
          )}
        </div>
        <dl className="panel-fields">
          <Field label="Repository">
            <Link href={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer">
              {item.repo}
            </Link>
          </Field>
          <Field label="Author">{item.author}</Field>
          <Field label="Your role">
            {item.roles.length ? item.roles.map((r) => ROLE_LABELS[r]).join(', ') : '—'}
          </Field>
          <Field label="Assignees">{item.assignees.length ? item.assignees.join(', ') : '—'}</Field>
          <Field label="Labels">
            {item.labels.length
              ? item.labels.map((l) => (
                  <Label key={l} variant="secondary" className="item-label">
                    {l}
                  </Label>
                ))
              : '—'}
          </Field>
          <Field label="Comments">{item.commentCount}</Field>
          <Field label="Last activity">
            <span title={absoluteTime(item.lastActivityAt)}>
              {relativeTime(item.lastActivityAt)}
              {item.lastActivityBy ? ` by ${item.lastActivityBy}` : ''}
            </span>
          </Field>
          {item.hiddenAt && (
            <Field label={item.hidden === 'done' ? 'Done since' : 'Muted since'}>
              {absoluteTime(item.hiddenAt)}
            </Field>
          )}
        </dl>

        {item.type === 'issue' && (
          <section className="panel-section">
            <h3>Linked pull requests</h3>
            {item.linkedPrs.length === 0 ? (
              <p className="fg-muted">None yet.</p>
            ) : (
              <ul className="linked-prs">
                {item.linkedPrs.map((pr) => {
                  const v = linkedPrVisual(pr);
                  const PrIcon = v.icon;
                  return (
                    <li key={pr.url}>
                      <span style={{ color: cssVar(v.color) }}>
                        <PrIcon aria-label={v.label} size={16} />
                      </span>{' '}
                      <Link href={pr.url} target="_blank" rel="noreferrer">
                        {pr.repo} #{pr.number}
                      </Link>{' '}
                      <span className="fg-muted">{pr.state}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="panel-section">
          <h3>Recent activity</h3>
          {error && <p className="fg-danger">Could not load activity: {error.message}</p>}
          {!activity && !error && (
            <div className="stack">
              <SkeletonBox height="20px" width="80%" />
              <SkeletonBox height="20px" width="60%" />
              <SkeletonBox height="20px" width="70%" />
            </div>
          )}
          {activity && activity.length === 0 && <p className="fg-muted">No activity recorded yet.</p>}
          {activity && activity.length > 0 && (
            <Timeline clipSidebar>
              {activity.map((a) => {
                const AIcon = ACTIVITY_ICONS[a.kind];
                return (
                  <Timeline.Item key={a.id} condensed>
                    <Timeline.Badge>
                      <AIcon size={16} />
                    </Timeline.Badge>
                    <Timeline.Body>
                      {a.actor && <strong>{a.actor} </strong>}
                      {a.url ? (
                        <Link href={a.url} target="_blank" rel="noreferrer" muted>
                          {a.summary}
                        </Link>
                      ) : (
                        a.summary
                      )}{' '}
                      <span className="fg-muted" title={absoluteTime(a.at)}>
                        {relativeTime(a.at)}
                      </span>
                    </Timeline.Body>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          )}
        </section>
      </div>
    </Dialog>
  );
}
