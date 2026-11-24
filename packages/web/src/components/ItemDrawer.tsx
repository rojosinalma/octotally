import type { Activity, Item } from '@octotally/shared';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  ButtonLink,
  Cluster,
  Drawer,
  EmptyState,
  Fact,
  Facts,
  Icon,
  type IconName,
  List,
  ListItem,
  RelativeTime,
  Section,
  Stack,
  StateLabel,
  Timeline,
  TimelineItem,
} from 'tailor/core';
import { QueryView } from 'tailor/data';
import { AppLink } from 'tailor/kit/link';
import { api, type ItemAction } from '../api';
import { linkedPrVisual, needsPr, ROLE_LABELS, stateVisual } from '../lib/colors';
import { absoluteTime } from '../lib/format';
import { keys } from '../queries';

const ACTIVITY_ICONS: Record<Activity['kind'], IconName> = {
  comment: 'bi:chat',
  review: 'bi:check2',
  commit: 'bi:git',
  state: 'bi:clock-history',
  label: 'bi:tag',
  edit: 'bi:pencil',
  reply: 'bi:reply',
  other: 'bi:clock-history',
};

interface Props {
  item: Item | null;
  onClose: () => void;
  onAction: (item: Item, action: ItemAction) => void;
}

const dash = (list: readonly string[]) => (list.length ? list.join(', ') : '—');

function Details({ item }: { item: Item }) {
  const visual = stateVisual(item);
  const activity = useQuery({
    queryKey: keys.item(item.id),
    queryFn: () => api.item(item.id).then((r) => r.activity),
  });
  return (
    <Stack gap="5">
      <Stack gap="2">
        <p>
          {item.repo} #{item.number} · opened by {item.author} <RelativeTime date={item.createdAt} />
        </p>
        <Cluster gap="2" align="center">
          <StateLabel tone={visual.tone} icon={<Icon name={visual.icon} />}>
            {visual.label}
          </StateLabel>
          {item.hidden !== 'none' ? (
            <Badge tone={item.hidden === 'done' ? 'accent' : 'warning'}>
              {item.hidden === 'done' ? 'Done' : 'Muted'}
            </Badge>
          ) : null}
          {needsPr(item) ? (
            <Badge tone="warning">{item.type === 'discussion' ? 'Unanswered' : 'Needs PR'}</Badge>
          ) : null}
        </Cluster>
      </Stack>
      <Facts>
        <Fact name="Repository">
          <AppLink to={`https://github.com/${item.repo}`} target="_blank" rel="noreferrer">
            {item.repo}
          </AppLink>
        </Fact>
        <Fact name="Author">{item.author}</Fact>
        <Fact name="Your role">{dash(item.roles.map((r) => ROLE_LABELS[r]))}</Fact>
        <Fact name="Assignees">{dash(item.assignees)}</Fact>
        <Fact name="Labels">
          {item.labels.length ? (
            <Cluster gap="1">
              {item.labels.map((l) => (
                <Badge key={l} variant="outline">
                  {l}
                </Badge>
              ))}
            </Cluster>
          ) : (
            '—'
          )}
        </Fact>
        <Fact name="Comments">{item.commentCount}</Fact>
        <Fact name="Last activity">
          <RelativeTime date={item.lastActivityAt} />
          {item.lastActivityBy ? ` by ${item.lastActivityBy}` : ''}
        </Fact>
        {item.hiddenAt ? (
          <Fact name={item.hidden === 'done' ? 'Done since' : 'Muted since'}>
            {absoluteTime(item.hiddenAt)}
          </Fact>
        ) : null}
      </Facts>
      {item.type === 'issue' ? (
        <Section title="Linked pull requests">
          {item.linkedPrs.length === 0 ? (
            <EmptyState size="sm" title="No linked pull request yet" />
          ) : (
            <List label="Linked pull requests">
              {item.linkedPrs.map((pr) => {
                const v = linkedPrVisual(pr);
                return (
                  <ListItem
                    key={pr.url}
                    leading={
                      <StateLabel tone={v.tone} icon={<Icon name={v.icon} />}>
                        <span className="t-sr-only">{v.label}</span>
                      </StateLabel>
                    }
                    title={
                      <AppLink to={pr.url} target="_blank" rel="noreferrer">
                        {pr.repo} #{pr.number}
                      </AppLink>
                    }
                    trailing={v.label}
                  />
                );
              })}
            </List>
          )}
        </Section>
      ) : null}
      <Section title="Recent activity">
        <QueryView query={activity} empty={<EmptyState size="sm" title="No activity recorded yet" />}>
          {(events) => (
            <Timeline label="Recent activity">
              {events.map((a) => (
                <TimelineItem
                  key={a.id}
                  icon={<Icon name={ACTIVITY_ICONS[a.kind]} />}
                  title={
                    <>
                      {a.actor ? `${a.actor} ` : ''}
                      {a.url ? (
                        <AppLink to={a.url} target="_blank" rel="noreferrer">
                          {a.summary}
                        </AppLink>
                      ) : (
                        a.summary
                      )}
                    </>
                  }
                  time={<RelativeTime date={a.at} />}
                />
              ))}
            </Timeline>
          )}
        </QueryView>
      </Section>
    </Stack>
  );
}

/** The details of one item beside the list: facts, linked pull requests, recent activity and its actions. */
export function ItemDrawer({ item, onClose, onAction }: Props) {
  const hidden = item?.hidden !== 'none';
  return (
    <Drawer
      title={item?.title ?? 'Item'}
      size="md"
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        item ? (
          <>
            {hidden ? (
              <Button
                icon={<Icon name="bi:arrow-counterclockwise" />}
                onClick={() => onAction(item, 'restore')}
              >
                Restore
              </Button>
            ) : (
              <>
                <Button icon={<Icon name="bi:bell-slash" />} onClick={() => onAction(item, 'mute')}>
                  Mute
                </Button>
                <Button icon={<Icon name="bi:check2" />} onClick={() => onAction(item, 'done')}>
                  Done
                </Button>
              </>
            )}
            <ButtonLink
              variant="primary"
              icon={<Icon name="bi:box-arrow-up-right" />}
              to={item.url}
              target="_blank"
              rel="noreferrer"
            >
              Open on GitHub
            </ButtonLink>
          </>
        ) : null
      }
    >
      {item ? <Details item={item} /> : null}
    </Drawer>
  );
}
