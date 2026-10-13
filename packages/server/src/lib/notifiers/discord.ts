import type { Settings } from '@octotally/shared';
import { log } from '../../log';
import { USER_AGENT } from '../../version';
import type { DigestMessage } from '../digest';
import type { Notifier } from './index';

/** Discord embed description limit; messages are split across embeds (max 10 per request). */
const EMBED_LIMIT = 4000;
const EMBEDS_PER_REQUEST = 10;
const TITLE_LIMIT = 256;

export function chunkLines(lines: string[], limit: number): string[] {
  const chunks: string[] = [];
  let cur = '';
  for (const raw of lines) {
    const line = raw.length > limit ? `${raw.slice(0, limit - 1)}…` : raw;
    if (cur.length + line.length + 1 > limit && cur) {
      chunks.push(cur);
      cur = '';
    }
    cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export function assertHttps(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('Discord webhook URL must use https');
  return u;
}

export const discord: Notifier = {
  name: 'discord',
  label: 'Discord webhook',
  configured: (s) => s.discordWebhookUrl.length > 0,
  async send(message: DigestMessage, settings: Settings) {
    const url = assertHttps(settings.discordWebhookUrl);
    const chunks = chunkLines(message.lines.length ? message.lines : ['(nothing to report)'], EMBED_LIMIT);
    const logger = log('notify');
    for (let i = 0; i < chunks.length; i += EMBEDS_PER_REQUEST) {
      const batch = chunks.slice(i, i + EMBEDS_PER_REQUEST);
      const embeds = batch.map((description, j) => ({
        title: i + j === 0 ? message.title.slice(0, TITLE_LIMIT) : undefined,
        description,
        footer: i + j === chunks.length - 1 && message.footer ? { text: message.footer } : undefined,
      }));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT },
        body: JSON.stringify({ embeds }),
        signal: AbortSignal.timeout(15_000),
      });
      logger.info({ notifier: 'discord', status: res.status, embeds: embeds.length }, 'webhook POST');
      if (!res.ok) throw new Error(`Discord webhook returned HTTP ${res.status}`);
    }
  },
};
