import type { Item, LinkedPr, Role } from '@octotally/shared';
import type { IconName } from 'tailor/core';

/** Tailor tone of an item state (GitHub's open/closed/done colours on the palette; done = accent). */
export type StateTone = 'success' | 'danger' | 'accent' | 'neutral';

export interface StateVisual {
  /** Tailor icon name (`<set>:<name>`; `tailor icons` adds it to public/tailor/icons.svg). */
  icon: IconName;
  tone: StateTone;
  /** Accessible label, e.g. "Open pull request". */
  label: string;
  /** The kind of state. */
  state: 'open' | 'closed' | 'done' | 'draft';
  /** The state in one word, as GitHub says it: Open, Closed, Merged, Draft, Answered. */
  word: string;
}

type StateInput = Pick<Item, 'type' | 'state' | 'isDraft' | 'isAnswered'>;

export const ICONS = {
  issueOpen: 'bi:record-circle',
  issueClosed: 'bi:check-circle',
  pr: 'bi:file-diff',
  prClosed: 'bi:file-diff',
  prDraft: 'bi:file-earmark-diff',
  merged: 'bi:sign-merge-left',
  discussion: 'bi:chat-square-text',
  discussionClosed: 'bi:chat-square',
} as const satisfies Record<string, IconName>;

export function stateVisual(item: StateInput): StateVisual {
  switch (item.type) {
    case 'issue':
      return item.state === 'open'
        ? { icon: ICONS.issueOpen, tone: 'success', label: 'Open issue', word: 'Open', state: 'open' }
        : { icon: ICONS.issueClosed, tone: 'accent', label: 'Closed issue', word: 'Closed', state: 'done' };
    case 'pr':
      if (item.state === 'merged')
        return {
          icon: ICONS.merged,
          tone: 'accent',
          label: 'Merged pull request',
          word: 'Merged',
          state: 'done',
        };
      if (item.state === 'closed')
        return {
          icon: ICONS.prClosed,
          tone: 'danger',
          label: 'Closed pull request',
          word: 'Closed',
          state: 'closed',
        };
      if (item.isDraft)
        return {
          icon: ICONS.prDraft,
          tone: 'neutral',
          label: 'Draft pull request',
          word: 'Draft',
          state: 'draft',
        };
      return { icon: ICONS.pr, tone: 'success', label: 'Open pull request', word: 'Open', state: 'open' };
    case 'discussion':
      if (item.state !== 'open')
        return {
          icon: ICONS.discussionClosed,
          tone: 'neutral',
          label: 'Closed discussion',
          word: 'Closed',
          state: 'closed',
        };
      return item.isAnswered
        ? {
            icon: ICONS.discussion,
            tone: 'accent',
            label: 'Answered discussion',
            word: 'Answered',
            state: 'done',
          }
        : { icon: ICONS.discussion, tone: 'success', label: 'Open discussion', word: 'Open', state: 'open' };
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
