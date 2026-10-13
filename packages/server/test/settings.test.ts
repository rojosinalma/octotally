import { describe, expect, test } from 'bun:test';
import { BUILTIN_VIEWS, DEFAULT_SETTINGS } from '@octotally/shared';
import { getSettings, listViews, patchSettings, seedViews } from '../src/lib/settings';
import { memDb } from './helpers';

describe('settings', () => {
  test('defaults when the table is empty', () => {
    const h = memDb();
    expect(getSettings(h.db)).toEqual(DEFAULT_SETTINGS);
  });

  test('patch persists and merges', () => {
    const h = memDb();
    const s = patchSettings(h.db, {
      pollIntervalMin: 5,
      discordWebhookUrl: 'https://discord.com/api/webhooks/1/x',
    });
    expect(s.pollIntervalMin).toBe(5);
    expect(s.activeWindowDays).toBe(DEFAULT_SETTINGS.activeWindowDays);
    expect(getSettings(h.db).discordWebhookUrl).toBe('https://discord.com/api/webhooks/1/x');
  });

  test('rejects out-of-range and non-https webhook', () => {
    const h = memDb();
    expect(() => patchSettings(h.db, { pollIntervalMin: 0 })).toThrow();
    expect(() => patchSettings(h.db, { discordWebhookUrl: 'http://discord.com/x' })).toThrow();
    expect(() => patchSettings(h.db, { theme: 'solarized' })).toThrow();
    expect(getSettings(h.db)).toEqual(DEFAULT_SETTINGS);
  });

  test('empty webhook URL is allowed (unset)', () => {
    const h = memDb();
    expect(patchSettings(h.db, { discordWebhookUrl: '' }).discordWebhookUrl).toBe('');
  });

  test('a corrupt stored value falls back to its default without losing the others', () => {
    const h = memDb();
    patchSettings(h.db, { pollIntervalMin: 7 });
    h.sqlite.run(
      "INSERT INTO settings (key, value, updated_at) VALUES ('activeWindowDays', '\"nope\"', '2026-01-01')",
    );
    const s = getSettings(h.db);
    expect(s.activeWindowDays).toBe(DEFAULT_SETTINGS.activeWindowDays);
    expect(s.pollIntervalMin).toBe(7);
  });

  test('seedViews is idempotent and keeps renames', () => {
    const h = memDb();
    h.sqlite.run("UPDATE views SET name = 'Hot' WHERE id = 'active'");
    seedViews(h.db);
    const views = listViews(h.db);
    expect(views).toHaveLength(BUILTIN_VIEWS.length);
    expect(views.find((v) => v.id === 'active')?.name).toBe('Hot');
  });
});
