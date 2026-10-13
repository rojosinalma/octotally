import { describe, expect, test } from 'bun:test';
import {
  applySuggestion,
  chipsFromQuery,
  hasToken,
  quoteToken,
  removeToken,
  setSingleQualifier,
  suggest,
  toggleToken,
} from '../src/lib/search';

describe('chipsFromQuery', () => {
  test('qualifiers, text and unknown tokens', () => {
    const chips = chipsFromQuery('is:open -is:pr label:"help wanted" bogus:1 flaky');
    expect(chips.map((c) => c.kind)).toEqual(['qualifier', 'qualifier', 'qualifier', 'unknown', 'text']);
    expect(chips[1]).toMatchObject({ key: 'is', value: 'pr', negated: true, label: '-is:pr' });
    expect(chips[2]?.label).toBe('label:"help wanted"');
    expect(chips[4]?.label).toBe('"flaky"');
  });
  test('empty query', () => {
    expect(chipsFromQuery('')).toEqual([]);
  });
});

describe('token editing', () => {
  test('toggle adds and removes', () => {
    const q = toggleToken('is:open', 'is:pr');
    expect(q).toBe('is:open is:pr');
    expect(hasToken(q, 'IS:PR')).toBe(true);
    expect(toggleToken(q, 'is:pr')).toBe('is:open');
  });
  test('remove keeps quoting', () => {
    expect(removeToken('label:"help wanted" is:open', 'is:open')).toBe('label:"help wanted"');
    expect(quoteToken('foo bar')).toBe('"foo bar"');
    expect(quoteToken('-label:a b')).toBe('-label:"a b"');
  });
  test('single-valued qualifiers replace', () => {
    expect(setSingleQualifier('is:open updated:>7d', 'updated', '>30d')).toBe('is:open updated:>30d');
    expect(setSingleQualifier('is:open updated:>7d', 'updated', null)).toBe('is:open');
  });
});

describe('suggest', () => {
  test('qualifier names', () => {
    const s = suggest('is:open la');
    expect(s?.partial).toBe('la');
    expect(s?.items[0]?.insert).toBe('label:');
  });
  test('values with context', () => {
    const s = suggest('repo:oct', { repos: ['rojosinalma/octotally', 'other/repo'] });
    expect(s?.items.map((i) => i.insert)).toEqual(['repo:rojosinalma/octotally']);
    expect(suggest('-is:cl')?.items[0]?.insert).toBe('-is:closed');
  });
  test('nothing after whitespace', () => {
    expect(suggest('is:open ')).toBeNull();
  });
  test('applySuggestion', () => {
    expect(applySuggestion('is:open la', 'la', 'label:')).toBe('is:open label:');
    expect(applySuggestion('is:open label:b', 'label:b', 'label:bug')).toBe('is:open label:bug ');
  });
});
