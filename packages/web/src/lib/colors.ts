import type { Item, LinkedPr, Role } from '@octotally/shared';

/** Tailor tone of an item state (GitHub's open/closed/done colours on the palette). */
export type StateTone = 'success' | 'danger' | 'purple' | 'neutral';

export interface StateVisual {
  /** Sprite icon id (`<set>-<name>` in public/tailor/icons.svg). */
  icon: string;
  tone: StateTone;
  /** Accessible label, e.g. "Open pull request". */
  label: string;
  /** Tailor state-label state. */
  state: 'open' | 'closed' | 'done' | 'draft';
}

type StateInput = Pick<Item, 'type' | 'state' | 'isDraft' | 'isAnswered'>;

export const ICONS = {
  issueOpen: 'lucide-circle-dot',
  issueClosed: 'lucide-circle-check',
  pr: 'lucide-git-pull-request',
  prClosed: 'lucide-git-pull-request-closed',
  prDraft: 'lucide-git-pull-request-draft',
  merged: 'lucide-git-merge',
  discussion: 'lucide-messages-square',
  discussionClosed: 'lucide-message-square-x',
} as const;

export function stateVisual(item: StateInput): StateVisual {
  switch (item.type) {
    case 'issue':
      return item.state === 'open'
        ? { icon: ICONS.issueOpen, tone: 'success', label: 'Open issue', state: 'open' }
        : { icon: ICONS.issueClosed, tone: 'purple', label: 'Closed issue', state: 'done' };
    case 'pr':
      if (item.state === 'merged')
        return { icon: ICONS.merged, tone: 'purple', label: 'Merged pull request', state: 'done' };
      if (item.state === 'closed')
        return { icon: ICONS.prClosed, tone: 'danger', label: 'Closed pull request', state: 'closed' };
      if (item.isDraft)
        return { icon: ICONS.prDraft, tone: 'neutral', label: 'Draft pull request', state: 'draft' };
      return { icon: ICONS.pr, tone: 'success', label: 'Open pull request', state: 'open' };
    case 'discussion':
      if (item.state !== 'open')
        return { icon: ICONS.discussionClosed, tone: 'neutral', label: 'Closed discussion', state: 'closed' };
      return item.isAnswered
        ? { icon: ICONS.discussion, tone: 'purple', label: 'Answered discussion', state: 'done' }
        : { icon: ICONS.discussion, tone: 'success', label: 'Open discussion', state: 'open' };
  }
}

export function linkedPrVisual(pr: Pick<LinkedPr, 'state'>): StateVisual {
  return stateVisual({ type: 'pr', state: pr.state, isDraft: false, isAnswered: null });
}

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
