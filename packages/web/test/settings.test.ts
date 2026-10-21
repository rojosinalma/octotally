import { describe, expect, test } from 'bun:test';
import { parseSetting } from '../src/lib/settings';

describe('parseSetting', () => {
  test.each([
    ['activeWindowDays', '30', { patch: { activeWindowDays: 30 } }],
    ['activeWindowDays', '2.5', { error: 'Enter a whole number' }],
    ['digestHour', '', { error: 'Enter a whole number' }],
    ['pollIntervalMin', '900', { patch: { pollIntervalMin: 15 } }],
    ['backoffMaxMin', '7200', { patch: { backoffMaxMin: 120 } }],
    ['pollIntervalMin', '90', { error: 'Use whole minutes (at least 1 min)' }],
    ['pollIntervalMin', '30', { error: 'Use whole minutes (at least 1 min)' }],
    ['digestDaily', 'true', { patch: { digestDaily: true } }],
    ['digestRealtime', 'false', { patch: { digestRealtime: false } }],
    ['discordWebhookUrl', '', { patch: { discordWebhookUrl: '' } }],
    [
      'discordWebhookUrl',
      ' https://discord.com/api/webhooks/1/abc ',
      { patch: { discordWebhookUrl: 'https://discord.com/api/webhooks/1/abc' } },
    ],
    [
      'discordWebhookUrl',
      'http://example.com/hook',
      { error: 'Must be an https:// URL (or empty to disable)' },
    ],
    ['skin', 'pico', { patch: { skin: 'pico' } }],
    ['timezone', 'Europe/Berlin', { patch: { timezone: 'Europe/Berlin' } }],
  ] as const)('%s = %p', (key, value, expected) => {
    expect(parseSetting(key, value)).toEqual(expected);
  });
});
