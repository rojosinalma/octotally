import { describe, expect, test } from 'bun:test';
import {
  CommentDiscussionIcon,
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
  IssueClosedIcon,
  IssueOpenedIcon,
} from '@primer/octicons-react';
import { needsPr, stateVisual } from '../src/lib/colors';

describe('stateVisual', () => {
  test('issues', () => {
    expect(stateVisual({ type: 'issue', state: 'open', isDraft: false, isAnswered: null })).toMatchObject({
      icon: IssueOpenedIcon,
      color: 'fgColor-open',
    });
    expect(stateVisual({ type: 'issue', state: 'closed', isDraft: false, isAnswered: null })).toMatchObject({
      icon: IssueClosedIcon,
      color: 'fgColor-done',
    });
  });
  test('pull requests', () => {
    expect(stateVisual({ type: 'pr', state: 'open', isDraft: false, isAnswered: null })).toMatchObject({
      icon: GitPullRequestIcon,
      color: 'fgColor-open',
    });
    expect(stateVisual({ type: 'pr', state: 'open', isDraft: true, isAnswered: null })).toMatchObject({
      icon: GitPullRequestDraftIcon,
      color: 'fgColor-muted',
    });
    expect(stateVisual({ type: 'pr', state: 'merged', isDraft: false, isAnswered: null })).toMatchObject({
      icon: GitMergeIcon,
      color: 'fgColor-done',
    });
    expect(stateVisual({ type: 'pr', state: 'closed', isDraft: false, isAnswered: null })).toMatchObject({
      icon: GitPullRequestClosedIcon,
      color: 'fgColor-closed',
    });
  });
  test('discussions', () => {
    expect(
      stateVisual({ type: 'discussion', state: 'open', isDraft: false, isAnswered: false }),
    ).toMatchObject({
      icon: CommentDiscussionIcon,
      color: 'fgColor-open',
    });
    expect(stateVisual({ type: 'discussion', state: 'open', isDraft: false, isAnswered: true }).color).toBe(
      'fgColor-done',
    );
  });
});

describe('needsPr', () => {
  test('open issue without linked PR', () => {
    expect(needsPr({ type: 'issue', state: 'open', linkedPrs: [], isAnswered: null })).toBe(true);
    expect(
      needsPr({
        type: 'issue',
        state: 'open',
        linkedPrs: [{ number: 1, url: 'https://github.com/a/b/pull/1', state: 'open', repo: 'a/b' }],
        isAnswered: null,
      }),
    ).toBe(false);
    expect(needsPr({ type: 'issue', state: 'closed', linkedPrs: [], isAnswered: null })).toBe(false);
    expect(needsPr({ type: 'pr', state: 'open', linkedPrs: [], isAnswered: null })).toBe(false);
    expect(needsPr({ type: 'discussion', state: 'open', linkedPrs: [], isAnswered: false })).toBe(true);
    expect(needsPr({ type: 'discussion', state: 'open', linkedPrs: [], isAnswered: true })).toBe(false);
  });
});
