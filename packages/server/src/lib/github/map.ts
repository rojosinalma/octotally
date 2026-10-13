import type { Item, ItemState, LinkedPr } from '@octotally/shared';
import type { DiscussionNode, IssueNode, PullRequestNode } from './schema';

/** What GitHub tells us about an item; local state (roles, hidden, …) is merged in by sync. */
export type RemoteItem = Omit<
  Item,
  'roles' | 'hidden' | 'hiddenAt' | 'mutedActivityAt' | 'firstSeenAt' | 'lastSyncedAt'
> & {
  /** Most recent comment/review we know of, for activity attribution. */
  lastEvent: { kind: 'comment' | 'review'; actor: string | null; at: string; url: string | null } | null;
};

const iso = (s: string) => new Date(s).toISOString();
const login = (a: { login: string } | null | undefined) => a?.login ?? 'ghost';
const names = (l: { nodes: ({ name: string } | null)[] } | null | undefined) =>
  (l?.nodes ?? []).flatMap((n) => (n ? [n.name] : []));
const logins = (l: { nodes: ({ login: string } | null)[] } | null | undefined) =>
  (l?.nodes ?? []).flatMap((n) => (n ? [n.login] : []));

function prState(state: 'OPEN' | 'CLOSED' | 'MERGED'): ItemState {
  return state === 'MERGED' ? 'merged' : state === 'CLOSED' ? 'closed' : 'open';
}

function lastComment(c: IssueNode['comments']): RemoteItem['lastEvent'] {
  const n = c.nodes.at(-1);
  if (!n) return null;
  return { kind: 'comment', actor: n.author?.login ?? null, at: iso(n.createdAt), url: n.url };
}

export function mapIssue(n: IssueNode): RemoteItem {
  const linkedPrs: LinkedPr[] = (n.closedByPullRequestsReferences?.nodes ?? []).flatMap((p) =>
    p ? [{ number: p.number, url: p.url, state: prState(p.state), repo: p.repository.nameWithOwner }] : [],
  );
  const lastEvent = lastComment(n.comments);
  return {
    id: n.id,
    type: 'issue',
    number: n.number,
    title: n.title,
    url: n.url,
    repo: n.repository.nameWithOwner,
    owner: n.repository.owner.login,
    state: n.state === 'CLOSED' ? 'closed' : 'open',
    isDraft: false,
    author: login(n.author),
    labels: names(n.labels),
    assignees: logins(n.assignees),
    commentCount: n.comments.totalCount,
    linkedPrs,
    isAnswered: null,
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
    lastActivityAt: iso(n.updatedAt),
    lastActivityBy: attributedActor(iso(n.updatedAt), lastEvent),
    lastEvent,
  };
}

export function mapPullRequest(n: PullRequestNode): RemoteItem {
  const comment = lastComment(n.comments);
  const r = n.reviews?.nodes.at(-1);
  const review: RemoteItem['lastEvent'] = r?.submittedAt
    ? { kind: 'review', actor: r.author?.login ?? null, at: iso(r.submittedAt), url: r.url }
    : null;
  const lastEvent =
    comment && review
      ? Date.parse(review.at) > Date.parse(comment.at)
        ? review
        : comment
      : (comment ?? review);
  return {
    id: n.id,
    type: 'pr',
    number: n.number,
    title: n.title,
    url: n.url,
    repo: n.repository.nameWithOwner,
    owner: n.repository.owner.login,
    state: prState(n.state),
    isDraft: n.isDraft,
    author: login(n.author),
    labels: names(n.labels),
    assignees: logins(n.assignees),
    commentCount: n.comments.totalCount,
    linkedPrs: [],
    isAnswered: null,
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
    lastActivityAt: iso(n.updatedAt),
    lastActivityBy: attributedActor(iso(n.updatedAt), lastEvent),
    lastEvent,
  };
}

export function mapDiscussion(n: DiscussionNode): RemoteItem {
  const lastEvent = lastComment(n.comments);
  return {
    id: n.id,
    type: 'discussion',
    number: n.number,
    title: n.title,
    url: n.url,
    repo: n.repository.nameWithOwner,
    owner: n.repository.owner.login,
    state: n.closed ? 'closed' : 'open',
    isDraft: false,
    author: login(n.author),
    labels: names(n.labels),
    assignees: [],
    commentCount: n.comments.totalCount,
    linkedPrs: [],
    isAnswered: n.isAnswered ?? false,
    createdAt: iso(n.createdAt),
    updatedAt: iso(n.updatedAt),
    lastActivityAt: iso(n.updatedAt),
    lastActivityBy: attributedActor(iso(n.updatedAt), lastEvent),
    lastEvent,
  };
}

/** The last comment/review author counts as "who acted last" only if it is what bumped `updatedAt`. */
const ATTRIBUTION_SLACK_MS = 5 * 60_000;
function attributedActor(updatedAt: string, ev: RemoteItem['lastEvent']): string | null {
  if (!ev) return null;
  return Math.abs(Date.parse(updatedAt) - Date.parse(ev.at)) <= ATTRIBUTION_SLACK_MS ? ev.actor : null;
}
