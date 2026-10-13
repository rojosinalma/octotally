import type { Item, LinkedPr, Role } from '@octotally/shared';
import {
  CommentDiscussionIcon,
  DiscussionClosedIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  type Icon,
  IssueClosedIcon,
  IssueOpenedIcon,
} from '@primer/octicons-react';

/** Primer functional colour tokens (CSS custom properties without the leading `--`). */
export type ColorToken =
  | 'fgColor-open'
  | 'fgColor-closed'
  | 'fgColor-done'
  | 'fgColor-muted'
  | 'fgColor-accent'
  | 'fgColor-success';

export interface StateVisual {
  /** Octicon component. */
  icon: Icon;
  /** Primer colour token, e.g. `fgColor-open`. */
  color: ColorToken;
  /** Accessible label, e.g. "Open pull request". */
  label: string;
  /** Primer StateLabel status, when one exists. */
  status:
    | 'issueOpened'
    | 'issueClosed'
    | 'pullOpened'
    | 'pullClosed'
    | 'pullMerged'
    | 'draft'
    | 'open'
    | 'closed';
}

type StateInput = Pick<Item, 'type' | 'state' | 'isDraft' | 'isAnswered'>;

export function stateVisual(item: StateInput): StateVisual {
  switch (item.type) {
    case 'issue':
      return item.state === 'open'
        ? { icon: IssueOpenedIcon, color: 'fgColor-open', label: 'Open issue', status: 'issueOpened' }
        : { icon: IssueClosedIcon, color: 'fgColor-done', label: 'Closed issue', status: 'issueClosed' };
    case 'pr':
      if (item.state === 'merged')
        return {
          icon: GitMergeIcon,
          color: 'fgColor-done',
          label: 'Merged pull request',
          status: 'pullMerged',
        };
      if (item.state === 'closed')
        return {
          icon: GitPullRequestClosedIcon,
          color: 'fgColor-closed',
          label: 'Closed pull request',
          status: 'pullClosed',
        };
      if (item.isDraft)
        return {
          icon: GitPullRequestDraftIcon,
          color: 'fgColor-muted',
          label: 'Draft pull request',
          status: 'draft',
        };
      return {
        icon: GitPullRequestIcon,
        color: 'fgColor-open',
        label: 'Open pull request',
        status: 'pullOpened',
      };
    case 'discussion':
      if (item.state !== 'open')
        return {
          icon: DiscussionClosedIcon,
          color: 'fgColor-muted',
          label: 'Closed discussion',
          status: 'closed',
        };
      return item.isAnswered
        ? { icon: CommentDiscussionIcon, color: 'fgColor-done', label: 'Answered discussion', status: 'open' }
        : { icon: CommentDiscussionIcon, color: 'fgColor-open', label: 'Open discussion', status: 'open' };
  }
}

export function linkedPrVisual(pr: Pick<LinkedPr, 'state'>): StateVisual {
  return stateVisual({ type: 'pr', state: pr.state, isDraft: false, isAnswered: null });
}

export const cssVar = (token: ColorToken) => `var(--${token})`;

export const ROLE_LABELS: Record<Role, string> = {
  author: 'Author',
  assigned: 'Assigned',
  mentioned: 'Mentioned',
  commenter: 'Commented',
  reviewer: 'Reviewer',
};

/** Open issue without any linked PR: the "needs PR" case. Discussions: open and unanswered. */
export function needsPr(item: Pick<Item, 'type' | 'state' | 'linkedPrs' | 'isAnswered'>): boolean {
  if (item.state !== 'open') return false;
  if (item.type === 'issue') return item.linkedPrs.length === 0;
  if (item.type === 'discussion') return item.isAnswered === false;
  return false;
}
