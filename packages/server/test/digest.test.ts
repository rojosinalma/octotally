import { describe, expect, test } from 'bun:test';
import { DEFAULT_SETTINGS } from '@octotally/shared';
import {
  buildDailyDigest,
  buildRealtimeDigest,
  dailyDue,
  dispatchDigest,
  hashPayload,
  localClock,
} from '../src/lib/digest';
import { setHidden } from '../src/lib/items';
import { notifiers } from '../src/lib/notifiers';
import { chunkLines } from '../src/lib/notifiers/discord';
import { patchSettings } from '../src/lib/settings';
import { Syncer } from '../src/lib/sync';
import { StaticToken } from '../src/lib/token';
import issuesPage from './fixtures/issues-page1.json';
import { fakeGitHub, memDb, must, noSleep } from './helpers';

const ISSUE = 'I_kwDOAbCdEf5xyz001';
const S = { ...DEFAULT_SETTINGS, discordWebhookUrl: 'https://discord.com/api/webhooks/1/x' };

function withNewComment(at: string) {
  const page = structuredClone(issuesPage);
  const n = page.data.search.nodes[0] as { updatedAt: string; comments: { nodes: unknown[] } };
  n.updatedAt = at;
  n.comments.nodes = [
    { author: { login: 'maintainer' }, createdAt: at, url: 'https://github.com/acme/widgets/issues/142#c' },
  ];
  return { InvolvedIssues: page };
}

async function seeded() {
  const h = memDb();
  const run = (o: Record<string, unknown> = {}) =>
    new Syncer({
      db: h.db,
      tokens: new StaticToken('t'),
      clientOptions: { fetch: fakeGitHub(o), sleep: noSleep },
    }).run();
  await run();
  const out = await run(withNewComment('2026-10-13T08:00:00Z'));
  return { h, newActivity: out.newActivity };
}

describe('digest building', () => {
  test('daily digest groups activity by item and adds counters', async () => {
    const { h } = await seeded();
    const msg = buildDailyDigest(h.db, S, '2000-01-01T00:00:00Z', new Date('2026-10-13T12:00:00Z'));
    expect(msg).not.toBeNull();
    expect(must(msg).title).toMatch(/1 new event/);
    expect(must(msg).lines[0]).toContain('acme/widgets#142');
    expect(must(msg).lines[1]).toContain('maintainer commented');
    expect(must(msg).footer).toMatch(/\d+ active · \d+ need a PR/);
  });

  test('nothing new → null; done items are excluded', async () => {
    const { h } = await seeded();
    expect(buildDailyDigest(h.db, S, '2999-01-01T00:00:00Z')).toBeNull();
    setHidden(h.db, ISSUE, 'done');
    expect(buildDailyDigest(h.db, S, '2000-01-01T00:00:00Z')).toBeNull();
  });

  test('realtime digest uses the sync output', async () => {
    const { h, newActivity } = await seeded();
    const msg = buildRealtimeDigest(h.db, newActivity);
    expect(msg?.kind).toBe('realtime');
    expect(msg?.lines).toHaveLength(2);
    expect(buildRealtimeDigest(h.db, [])).toBeNull();
  });

  test('hash is stable for the same content', () => {
    expect(hashPayload({ a: 1 })).toBe(hashPayload({ a: 1 }));
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
});

describe('dispatchDigest', () => {
  test('sends once, dedupes identical payloads, survives notifier failure', async () => {
    const { h } = await seeded();
    const sent: string[] = [];
    const original = must(notifiers.discord).send;
    must(notifiers.discord).send = async (m) => void sent.push(m.title);
    try {
      const msg = must(buildDailyDigest(h.db, S, '2000-01-01T00:00:00Z'));
      expect(await dispatchDigest(h.db, S, msg)).toEqual({ sent: ['discord'], skipped: false });
      expect(await dispatchDigest(h.db, S, msg)).toEqual({ sent: [], skipped: true });
      expect(sent).toHaveLength(1);
      must(notifiers.discord).send = async () => {
        throw new Error('webhook down');
      };
      const other = { ...msg, lines: ['different'] };
      expect(await dispatchDigest(h.db, S, other)).toEqual({ sent: [], skipped: false });
    } finally {
      must(notifiers.discord).send = original;
    }
  });

  test('no configured notifier → skipped', async () => {
    const { h } = await seeded();
    const r = await dispatchDigest(h.db, DEFAULT_SETTINGS, { kind: 'test', title: 't', lines: ['x'] });
    expect(r.skipped).toBe(true);
  });
});

describe('daily schedule', () => {
  test('localClock respects the zone and falls back to UTC', () => {
    const t = new Date('2026-10-13T23:30:00Z');
    expect(localClock(t, 'UTC')).toEqual({ date: '2026-10-13', hour: 23 });
    expect(localClock(t, 'Europe/Berlin')).toEqual({ date: '2026-10-14', hour: 1 });
    expect(localClock(t, 'Not/AZone')).toEqual({ date: '2026-10-13', hour: 23 });
  });

  test('dailyDue: off by default, due once per local day at/after digestHour', () => {
    const h = memDb();
    expect(dailyDue(h.db, DEFAULT_SETTINGS, new Date('2026-10-13T10:00:00Z'))).toBe(false);
    const s = patchSettings(h.db, { digestDaily: true, digestHour: 9, timezone: 'UTC' });
    expect(dailyDue(h.db, s, new Date('2026-10-13T08:59:00Z'))).toBe(false);
    expect(dailyDue(h.db, s, new Date('2026-10-13T09:00:00Z'))).toBe(true);
    h.sqlite.run(
      "INSERT INTO digests (sent_at, kind, notifier, payload_hash) VALUES ('2026-10-13T09:01:00.000Z', 'daily', 'discord', 'h')",
    );
    expect(dailyDue(h.db, s, new Date('2026-10-13T15:00:00Z'))).toBe(false);
    expect(dailyDue(h.db, s, new Date('2026-10-14T09:30:00Z'))).toBe(true);
  });
});

describe('discord notifier', () => {
  test('chunkLines respects the limit and never splits a line', () => {
    const lines = ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)];
    const chunks = chunkLines(lines, 65);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe(`${lines[0]}\n${lines[1]}`);
    expect(chunkLines(['x'.repeat(100)], 20)[0]).toHaveLength(20);
  });

  test('rejects non-https webhook URLs', async () => {
    await expect(
      must(notifiers.discord).send(
        { kind: 'test', title: 't', lines: [] },
        { ...S, discordWebhookUrl: 'http://x' },
      ),
    ).rejects.toThrow(/https/);
  });

  test('configured only when the URL is set', () => {
    expect(must(notifiers.discord).configured(DEFAULT_SETTINGS)).toBe(false);
    expect(must(notifiers.discord).configured(S)).toBe(true);
  });
});
