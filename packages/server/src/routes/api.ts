import { applySearch, type Item, SettingsPatch, View } from '@octotally/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppDeps } from '../app';
import { buildDailyDigest, dispatchDigest, lastDigestAt } from '../lib/digest';
import { getItem, listActivity, listItems, repoCounts, setHidden } from '../lib/items';
import { notifiers } from '../lib/notifiers';
import { loadSiblings } from '../lib/octoforge/siblings';
import { getSettings, getView, listViews, patchSettings } from '../lib/settings';
import { errInfo, log } from '../log';
import { VERSION } from '../version';
import { isZodError, jsonErr, jsonOk, zodMessage } from './respond';

const ViewCreate = z.object({
  id: View.shape.id.optional(),
  name: View.shape.name,
  query: View.shape.query,
  position: View.shape.position.optional(),
});
const ViewUpdate = z.object({
  name: View.shape.name.optional(),
  query: View.shape.query.optional(),
  position: View.shape.position.optional(),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'view'
  );
}

async function body(c: { req: { json(): Promise<unknown> } }): Promise<unknown> {
  return c.req.json().catch(() => ({}));
}

export function apiRoutes(deps: AppDeps) {
  const app = new Hono();
  const db = deps.dbh.db;

  app.get('/version', (c) => jsonOk(c, 'ok', { version: VERSION }));

  // --- items ---------------------------------------------------------------
  app.get('/items', async (c) => {
    const q = c.req.query('q') ?? '';
    const settings = await getSettings(db);
    const status = await deps.syncer.status(deps.poller.nextRunAt);
    const all: Item[] = await listItems(db);
    const items = applySearch(all, q, { settings, me: status.githubLogin ?? undefined });
    return jsonOk(c, 'ok', { items, total: items.length, query: q });
  });

  app.get('/items/:id', async (c) => {
    const item = await getItem(db, c.req.param('id'));
    if (!item) return jsonErr(c, 'not_found', 'item not found');
    return jsonOk(c, 'ok', { item, activity: await listActivity(db, item.id) });
  });

  for (const [action, hidden, message] of [
    ['mute', 'muted', 'muted until new activity'],
    ['done', 'done', 'marked done'],
    ['restore', 'none', 'restored'],
  ] as const) {
    app.post(`/items/:id/${action}`, async (c) => {
      const item = await setHidden(db, c.req.param('id'), hidden);
      if (!item) return jsonErr(c, 'not_found', 'item not found');
      return jsonOk(c, message, { item });
    });
  }

  // --- sync ------------------------------------------------------------------
  app.post('/refresh', (c) => {
    if (deps.syncer.isRunning) return jsonOk(c, 'sync already running', { started: false });
    void deps.poller.cycle();
    return jsonOk(c, 'sync started', { started: true });
  });

  app.get('/status', async (c) => {
    const status = await deps.syncer.status(deps.poller.nextRunAt);
    return jsonOk(c, 'ok', { status, tokenSource: deps.tokens.describe() });
  });

  // --- views -------------------------------------------------------------------
  app.get('/views', async (c) => jsonOk(c, 'ok', { views: await listViews(db) }));

  app.post('/views', async (c) => {
    const parsed = ViewCreate.safeParse(await body(c));
    if (!parsed.success) return jsonErr(c, 'validation', zodMessage(parsed.error));
    const id = parsed.data.id ?? slugify(parsed.data.name);
    if (await getView(db, id)) return jsonErr(c, 'validation', `a view with id "${id}" already exists`);
    const position = parsed.data.position ?? (await listViews(db)).length;
    const view: View = { id, name: parsed.data.name, query: parsed.data.query, builtin: false, position };
    await db.orm.insert(db.t.views).values(view);
    return jsonOk(c, 'view created', { view });
  });

  app.put('/views/:id', async (c) => {
    const current = await getView(db, c.req.param('id'));
    if (!current) return jsonErr(c, 'not_found', 'view not found');
    const parsed = ViewUpdate.safeParse(await body(c));
    if (!parsed.success) return jsonErr(c, 'validation', zodMessage(parsed.error));
    if (current.builtin && parsed.data.query !== undefined && parsed.data.query !== current.query) {
      return jsonErr(c, 'validation', 'built-in views can only be renamed or reordered');
    }
    await db.orm
      .update(db.t.views)
      .set({
        name: parsed.data.name ?? current.name,
        query: current.builtin ? current.query : (parsed.data.query ?? current.query),
        position: parsed.data.position ?? current.position,
      })
      .where(eq(db.t.views.id, current.id));
    return jsonOk(c, 'view updated', { view: (await getView(db, current.id)) as View });
  });

  app.delete('/views/:id', async (c) => {
    const current = await getView(db, c.req.param('id'));
    if (!current) return jsonErr(c, 'not_found', 'view not found');
    if (current.builtin) return jsonErr(c, 'validation', 'built-in views cannot be deleted');
    await db.orm.delete(db.t.views).where(eq(db.t.views.id, current.id));
    return jsonOk(c, 'view deleted', { id: current.id });
  });

  // --- settings ----------------------------------------------------------------
  app.get('/settings', async (c) => jsonOk(c, 'ok', { settings: await getSettings(db) }));

  app.put('/settings', async (c) => {
    const parsed = SettingsPatch.safeParse(await body(c));
    if (!parsed.success) return jsonErr(c, 'validation', zodMessage(parsed.error));
    if (parsed.data.timezone !== undefined && !validTimezone(parsed.data.timezone)) {
      return jsonErr(c, 'validation', `timezone: unknown IANA zone "${parsed.data.timezone}"`);
    }
    try {
      const settings = await patchSettings(db, parsed.data);
      return jsonOk(c, 'settings saved', { settings });
    } catch (err) {
      if (isZodError(err)) return jsonErr(c, 'validation', zodMessage(err));
      throw err;
    }
  });

  // --- misc ----------------------------------------------------------------------
  app.get('/repos', async (c) => jsonOk(c, 'ok', { repos: await repoCounts(db) }));

  // The member switcher: only when this instance is an Octoforge member and has a list.
  app.get('/siblings', async (c) =>
    jsonOk(c, 'ok', { siblings: deps.env.OCTOFORGE_TOKEN ? await loadSiblings(db) : null }),
  );

  app.get('/notifiers', async (c) => {
    const settings = await getSettings(db);
    const list = Object.values(notifiers).map((n) => ({
      name: n.name,
      label: n.label,
      configured: n.configured(settings),
    }));
    return jsonOk(c, 'ok', { notifiers: list });
  });

  app.post('/notifiers/:name/test', async (c) => {
    const n = notifiers[c.req.param('name')];
    if (!n) return jsonErr(c, 'not_found', 'unknown notifier');
    const settings = await getSettings(db);
    if (!n.configured(settings)) return jsonErr(c, 'validation', `${n.label} is not configured`);
    try {
      await n.send(
        {
          kind: 'test',
          title: 'Octotally test message',
          lines: ['If you can read this, the notifier works.'],
        },
        settings,
      );
      return jsonOk(c, `${n.label}: test message sent`, { notifier: n.name });
    } catch (err) {
      log('notify').warn({ notifier: n.name, err: errInfo(err) }, 'test send failed');
      return jsonErr(c, 'upstream', `${n.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Not strictly needed by the UI, but lets an operator re-send the last digest set by hand.
  app.post('/digest/send', async (c) => {
    const settings = await getSettings(db);
    const since = (await lastDigestAt(db, 'daily')) ?? new Date(Date.now() - 86_400_000).toISOString();
    const msg = await buildDailyDigest(db, settings, since);
    if (!msg) return jsonOk(c, 'nothing new to send', { sent: [] });
    const r = await dispatchDigest(db, settings, msg);
    return jsonOk(c, r.sent.length ? `digest sent via ${r.sent.join(', ')}` : 'digest not sent', r);
  });

  return app;
}

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
