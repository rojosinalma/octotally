import { describe, expect, test } from 'bun:test';
import { BUILTIN_VIEWS, DEFAULT_SETTINGS } from '@octotally/shared';
import { eq } from 'drizzle-orm';
import {
  getSettings,
  legacyThemeKeys,
  listViews,
  migrateLegacyTheme,
  patchSettings,
  seedViews,
} from '../src/lib/settings';
import { memDb } from './helpers';

describe('settings', () => {
  test('defaults when the table is empty', async () => {
    const h = await memDb();
    expect(await getSettings(h.db)).toEqual(DEFAULT_SETTINGS);
  });

  test('patch persists and merges', async () => {
    const h = await memDb();
    const s = await patchSettings(h.db, {
      pollIntervalMin: 5,
      discordWebhookUrl: 'https://discord.com/api/webhooks/1/x',
    });
    expect(s.pollIntervalMin).toBe(5);
    expect(s.activeWindowDays).toBe(DEFAULT_SETTINGS.activeWindowDays);
    expect((await getSettings(h.db)).discordWebhookUrl).toBe('https://discord.com/api/webhooks/1/x');
  });

  test('rejects out-of-range and non-https webhook', async () => {
    const h = await memDb();
    expect(patchSettings(h.db, { pollIntervalMin: 0 })).rejects.toThrow();
    expect(patchSettings(h.db, { discordWebhookUrl: 'http://discord.com/x' })).rejects.toThrow();
    expect(patchSettings(h.db, { mode: 'neon' })).rejects.toThrow();
    expect(patchSettings(h.db, { palette: 'Bad Id!' })).rejects.toThrow();
    expect(await getSettings(h.db)).toEqual(DEFAULT_SETTINGS);
  });

  test('empty webhook URL is allowed (unset)', async () => {
    const h = await memDb();
    expect((await patchSettings(h.db, { discordWebhookUrl: '' })).discordWebhookUrl).toBe('');
  });

  test('a corrupt stored value falls back to its default without losing the others', async () => {
    const h = await memDb();
    await patchSettings(h.db, { pollIntervalMin: 7 });
    await h.db.orm
      .insert(h.db.t.settings)
      .values({ key: 'activeWindowDays', value: '"nope"', updatedAt: '2026-01-01' });
    const s = await getSettings(h.db);
    expect(s.activeWindowDays).toBe(DEFAULT_SETTINGS.activeWindowDays);
    expect(s.pollIntervalMin).toBe(7);
  });

  test('seedViews is idempotent and keeps renames', async () => {
    const h = await memDb();
    await h.db.orm.update(h.db.t.views).set({ name: 'Hot' }).where(eq(h.db.t.views.id, 'active'));
    await seedViews(h.db);
    const views = await listViews(h.db);
    expect(views).toHaveLength(BUILTIN_VIEWS.length);
    expect(views.find((v) => v.id === 'active')?.name).toBe('Hot');
  });
});

describe('legacy theme migration', () => {
  const rows: [string, ReturnType<typeof legacyThemeKeys>][] = [
    ['auto', { mode: 'auto' }],
    ['light', { mode: 'light' }],
    ['light_colorblind', { mode: 'light' }],
    ['light_high_contrast', { mode: 'light' }],
    ['dark', { mode: 'dark' }],
    ['dark_dimmed', { mode: 'dark' }],
    ['dark_tritanopia', { mode: 'dark' }],
    ['dark_dracula', { mode: 'dark', palette: 'dracula' }],
    ['solarized', {}],
  ];

  const putTheme = (h: Awaited<ReturnType<typeof memDb>>, value: string) =>
    h.db.orm.insert(h.db.t.settings).values({ key: 'theme', value, updatedAt: '2026-01-01' });
  const keys = async (h: Awaited<ReturnType<typeof memDb>>) =>
    (await h.db.orm.select().from(h.db.t.settings)).map((r) => r.key).sort();

  for (const [theme, want] of rows) {
    test(`${theme} → ${JSON.stringify(want)}`, async () => {
      expect(legacyThemeKeys(theme)).toEqual(want);
      const h = await memDb();
      await putTheme(h, JSON.stringify(theme));
      await migrateLegacyTheme(h.db);
      const s = await getSettings(h.db);
      expect(s.mode).toBe(want.mode ?? DEFAULT_SETTINGS.mode);
      expect(s.palette).toBe(want.palette ?? DEFAULT_SETTINGS.palette);
      expect(await keys(h)).toEqual(Object.keys(want).sort());
    });
  }

  test('idempotent; no theme row is a no-op', async () => {
    const h = await memDb();
    await migrateLegacyTheme(h.db);
    expect(await keys(h)).toEqual([]);
    await putTheme(h, '"dark_dracula"');
    await migrateLegacyTheme(h.db);
    await migrateLegacyTheme(h.db);
    expect(await keys(h)).toEqual(['mode', 'palette']);
    expect((await getSettings(h.db)).palette).toBe('dracula');
  });

  test('existing mode/palette rows are not overwritten', async () => {
    const h = await memDb();
    await patchSettings(h.db, { mode: 'light', palette: 'nord' });
    await putTheme(h, '"dark_dracula"');
    await migrateLegacyTheme(h.db);
    const s = await getSettings(h.db);
    expect(s.mode).toBe('light');
    expect(s.palette).toBe('nord');
    expect(await keys(h)).toEqual(['mode', 'palette']);
  });

  test('an unparseable theme row is removed', async () => {
    const h = await memDb();
    await putTheme(h, 'not json');
    await migrateLegacyTheme(h.db);
    expect(await keys(h)).toEqual([]);
  });
});
