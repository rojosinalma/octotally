import { describe, expect, test } from 'bun:test';
import {
  hasToken,
  quoteToken,
  removeToken,
  setSingleQualifier,
  toggleToken,
  tokenOptions,
} from '../src/lib/search';

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

describe('tokenOptions', () => {
  test('known values, repositories with their owners, labels', () => {
    const options = tokenOptions({
      repos: [
        { repo: 'acme/api', count: 3 },
        { repo: 'acme/web', count: 1 },
      ],
      labels: [['help wanted', 2]],
    });
    const byValue = new Map(options.map((o) => [o.value, o]));
    expect(byValue.get('is:open')?.description).toBe('State or kind');
    expect(byValue.get('repo:acme/api')?.description).toBe('3 items');
    expect(byValue.get('org:acme')?.description).toBe('4 items');
    expect(byValue.get('label:help wanted')?.label).toBe('label:"help wanted"');
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });
});
