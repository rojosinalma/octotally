import { Settings, type SettingsPatch } from '@octotally/shared';

export type SettingKey = keyof Settings;
const INTEGER_KEYS = new Set<SettingKey>(['activeWindowDays', 'activityKeep', 'digestHour']);
const MINUTE_KEYS = new Set<SettingKey>(['pollIntervalMin', 'backoffMaxMin']);
const BOOLEAN_KEYS = new Set<SettingKey>(['digestDaily', 'digestRealtime']);

/** Row value (text, as the settings row reads it) → typed patch, or the reason it is not valid. */
export function parseSetting(key: SettingKey, value: string): { patch: SettingsPatch } | { error: string } {
  if (INTEGER_KEYS.has(key)) {
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n)) return { error: 'Enter a whole number' };
    return { patch: { [key]: n } };
  }
  if (MINUTE_KEYS.has(key)) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 60 || seconds % 60 !== 0)
      return { error: 'Use whole minutes (at least 1 min)' };
    return { patch: { [key]: seconds / 60 } };
  }
  if (BOOLEAN_KEYS.has(key)) return { patch: { [key]: value === 'true' } };
  if (key === 'discordWebhookUrl') {
    const parsed = Settings.shape.discordWebhookUrl.safeParse(value.trim());
    if (!parsed.success) return { error: 'Must be an https:// URL (or empty to disable)' };
    return { patch: { discordWebhookUrl: parsed.data } };
  }
  return { patch: { [key]: value } };
}
