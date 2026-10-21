import { describe, expect, test } from 'bun:test';
import { ICONS, needsPr, stateVisual } from '../src/lib/colors';

describe('stateVisual', () => {
  test('issues', () => {
    expect(stateVisual({ type: 'issue', state: 'open', isDraft: false, isAnswered: null })).toMatchObject({
      icon: ICONS.issueOpen,
      tone: 'success',
    });
    expect(stateVisual({ type: 'issue', state: 'closed', isDraft: false, isAnswered: null })).toMatchObject({
      icon: ICONS.issueClosed,
      tone: 'purple',
    });
  });
  test('pull requests', () => {
    expect(stateVisual({ type: 'pr', state: 'open', isDraft: false, isAnswered: null })).toMatchObject({
      icon: ICONS.pr,
      tone: 'success',
    });
    expect(stateVisual({ type: 'pr', state: 'open', isDraft: true, isAnswered: null })).toMatchObject({
      icon: ICONS.prDraft,
      tone: 'neutral',
    });
    expect(stateVisual({ type: 'pr', state: 'merged', isDraft: false, isAnswered: null })).toMatchObject({
      icon: ICONS.merged,
      tone: 'purple',
    });
    expect(stateVisual({ type: 'pr', state: 'closed', isDraft: false, isAnswered: null })).toMatchObject({
      icon: ICONS.prClosed,
      tone: 'danger',
    });
  });
  test('discussions', () => {
    expect(
      stateVisual({ type: 'discussion', state: 'open', isDraft: false, isAnswered: false }),
    ).toMatchObject({
      icon: ICONS.discussion,
      tone: 'success',
    });
    expect(stateVisual({ type: 'discussion', state: 'open', isDraft: false, isAnswered: true }).tone).toBe(
      'purple',
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
