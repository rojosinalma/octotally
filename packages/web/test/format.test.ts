import { describe, expect, test } from 'bun:test';
import { absoluteTime, plural } from '../src/lib/format';

describe('plural', () => {
  test('one and many', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(0, 'item')).toBe('0 items');
    expect(plural(2, 'item was', 'items were')).toBe('2 items were');
  });
});

describe('absoluteTime', () => {
  test('empty and invalid input', () => {
    expect(absoluteTime(null)).toBe('');
    expect(absoluteTime('not a date')).toBe('not a date');
  });
});
