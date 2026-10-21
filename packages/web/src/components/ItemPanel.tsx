import type { Activity, Item } from '@octotally/shared';
import type { ReactNode } from 'react';
import { Ui } from 'tailor-react';
import { type ApiError, api, type ItemAction } from '../api';
import { useAsync } from '../hooks/useAsync';
import { linkedPrVisual, needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';
import { absoluteTime, relativeTime } from '../lib/format';

interface Props {
  item: Item;
  onClose: () => void;
  onAction: (item: Item, action: ItemAction) => void;
}

const ACTIVITY_ICONS: Record<Activity['kind'], string> = {
  comment: 'lucide-message-square',
  review: 'bi-check2',
  commit: 'lucide-git-commit-horizontal',
  state: 'lucide-history',
  label: 'bi-tag',
  edit: 'bi-pencil',
  reply: 'bi-reply',
  other: 'lucide-history',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

export function ItemPanel({ item, onClose, onAction }: Props) {
  const detail = useAsync(() => api.item(item.id), item.id);
  const visual = stateVisual(item);
  const hidden = item.hidden !== 'none';
  const activity = detail.data?.activity ?? null;
  const error: ApiError | null = detail.error;

  return (
    <Ui.Dialog
      id="item-panel"
      drawer
      data-side="right"
      open
      size="lg"
      title={item.title}
      onClose={onClose}
      className="item-panel"
      footer={
        <>
          {hidden ? (
            <Ui.Button onClick={() => onAction(item, 'restore')}>
              <Ui.Icon name="lucide-history" /> Restore
            </Ui.Button>
          ) : (
            <>
              <Ui.Button onClick={() => onAction(item, 'mute')}>
                <Ui.Icon name="bi-bell-slash" /> Mute
              </Ui.Button>
              <Ui.Button onClick={() => onAction(item, 'done')}>
                <Ui.Icon name="bi-check2" /> Done
              </Ui.Button>
            </>
          )}
          <Ui.Button variant="primary" onClick={() => window.open(item.url, '_blank', 'noopener')}>
            <Ui.Icon name="bi-box-arrow-up-right" /> Open on GitHub
          </Ui.Button>
        </>
      }
    >
      <Ui.Stack gap="4">
        <p className="t-muted t-small panel-subtitle">
          {item.repo} #{item.number} · opened by {item.author} {relativeTime(item.createdAt)}
        </p>
        <Ui.Cluster gap="2" align="center">
          <Ui.StateLabel state={visual.state} size="sm" icon={visual.icon}>
            {visual.label}
          </Ui.StateLabel>
          {hidden && (
            <Ui.Badge tone={item.hidden === 'done' ? 'purple' : 'warning'}>
              {item.hidden === 'done' ? 'Done' : 'Muted'}
            </Ui.Badge>
          )}
          {needsPr(item) && (
            <Ui.Badge tone="warning">{item.type === 'discussion' ? 'Unanswered' : 'Needs PR'}</Ui.Badge>
          )}
        </Ui.Cluster>
        <Ui.Facts>
          <Field label="Repository">
            <a href={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer">
              {item.repo}
            </a>
          </Field>
          <Field label="Author">{item.author}</Field>
          <Field label="Your role">
            {item.roles.length ? item.roles.map((r) => ROLE_LABELS[r]).join(', ') : '—'}
          </Field>
          <Field label="Assignees">{item.assignees.length ? item.assignees.join(', ') : '—'}</Field>
          <Field label="Labels">
            {item.labels.length ? (
              <Ui.Cluster gap="1">
                {item.labels.map((l) => (
                  <Ui.Badge key={l} size="xs" variant="outline">
                    {l}
                  </Ui.Badge>
                ))}
              </Ui.Cluster>
            ) : (
              '—'
            )}
          </Field>
          <Field label="Comments">{item.commentCount}</Field>
          <Field label="Last activity">
            <span data-tip={absoluteTime(item.lastActivityAt)}>
              {relativeTime(item.lastActivityAt)}
              {item.lastActivityBy ? ` by ${item.lastActivityBy}` : ''}
            </span>
          </Field>
          {item.hiddenAt && (
            <Field label={item.hidden === 'done' ? 'Done since' : 'Muted since'}>
              {absoluteTime(item.hiddenAt)}
            </Field>
          )}
        </Ui.Facts>

        {item.type === 'issue' && (
          <section className="panel-section">
            <h3>Linked pull requests</h3>
            {item.linkedPrs.length === 0 ? (
              <p className="t-muted">None yet.</p>
            ) : (
              <ul className="t-plain-list linked-prs">
                {item.linkedPrs.map((pr) => {
                  const v = linkedPrVisual(pr);
                  return (
                    <li key={pr.url}>
                      <span className="t-tone-text" data-tone={v.tone}>
                        <Ui.Icon name={v.icon} label={v.label} />
                      </span>{' '}
                      <a href={pr.url} target="_blank" rel="noreferrer">
                        {pr.repo} #{pr.number}
                      </a>{' '}
                      <span className="t-muted">{pr.state}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="panel-section" aria-busy={!activity && !error ? true : undefined}>
          <h3>Recent activity</h3>
          {error && (
            <p className="t-tone-text" data-tone="danger">
              Could not load activity: {error.message}
            </p>
          )}
          {!activity && !error && (
            <Ui.Cluster gap="2" align="center">
              <Ui.Spinner size="sm" label={null} />
              <span className="t-muted">Loading activity…</span>
            </Ui.Cluster>
          )}
          {activity && activity.length === 0 && <p className="t-muted">No activity recorded yet.</p>}
          {activity && activity.length > 0 && (
            <Ui.Timeline>
              {activity.map((a) => (
                <Ui.Timeline.Item key={a.id} condensed badge={<Ui.Icon name={ACTIVITY_ICONS[a.kind]} />}>
                  {a.actor && <strong>{a.actor} </strong>}
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noreferrer">
                      {a.summary}
                    </a>
                  ) : (
                    a.summary
                  )}{' '}
                  <span className="t-muted" data-tip={absoluteTime(a.at)}>
                    {relativeTime(a.at)}
                  </span>
                </Ui.Timeline.Item>
              ))}
            </Ui.Timeline>
          )}
        </section>
      </Ui.Stack>
    </Ui.Dialog>
  );
}
