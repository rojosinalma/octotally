import type { Activity, Hidden, Item } from '@octotally/shared';
import { Item as ItemSchema } from '@octotally/shared';
import { count, desc, eq, gt } from 'drizzle-orm';
import type { Db, schema } from '../db';

type ItemRow = typeof schema.items.$inferSelect;

export function rowToItem(r: ItemRow): Item {
  return ItemSchema.parse({
    ...r,
    isAnswered: r.isAnswered ?? null,
    roles: r.roles,
  });
}

export async function listItems(db: Db): Promise<Item[]> {
  const rows = await db.orm.select().from(db.t.items);
  return rows.map(rowToItem);
}

export async function getItem(db: Db, id: string): Promise<Item | null> {
  const [r] = await db.orm.select().from(db.t.items).where(eq(db.t.items.id, id)).limit(1);
  return r ? rowToItem(r) : null;
}

export async function countItems(db: Db): Promise<number> {
  const [r] = await db.orm.select({ n: count() }).from(db.t.items);
  return r?.n ?? 0;
}

export async function listActivity(db: Db, itemId: string, limit = 100): Promise<Activity[]> {
  const t = db.t.activity;
  const rows = await db.orm.select().from(t).where(eq(t.itemId, itemId)).orderBy(desc(t.at)).limit(limit);
  return rows.map(rowToActivity);
}

/** Activity the tracker noticed after `sinceSeenAt` (ISO), newest first, bounded. */
export async function listActivitySince(db: Db, sinceSeenAt: string, limit = 500): Promise<Activity[]> {
  const t = db.t.activity;
  const rows = await db.orm
    .select()
    .from(t)
    .where(gt(t.seenAt, sinceSeenAt))
    .orderBy(desc(t.at))
    .limit(limit);
  return rows.map(rowToActivity);
}

function rowToActivity(r: typeof schema.activity.$inferSelect): Activity {
  return {
    id: r.id,
    itemId: r.itemId,
    kind: r.kind as Activity['kind'],
    actor: r.actor,
    summary: r.summary,
    url: r.url,
    at: r.at,
  };
}

/** mute / done / restore. Mute records the current activity point so later activity un-mutes. */
export async function setHidden(db: Db, id: string, hidden: Hidden, now = new Date()): Promise<Item | null> {
  const current = await getItem(db, id);
  if (!current) return null;
  const iso = now.toISOString();
  await db.orm
    .update(db.t.items)
    .set({
      hidden,
      hiddenAt: hidden === 'none' ? null : iso,
      mutedActivityAt: hidden === 'muted' ? current.lastActivityAt : null,
    })
    .where(eq(db.t.items.id, id));
  return getItem(db, id);
}

export async function repoCounts(db: Db): Promise<{ repo: string; count: number }[]> {
  const t = db.t.items;
  const n = count();
  return db.orm
    .select({ repo: t.repo, count: n })
    .from(t)
    .where(eq(t.hidden, 'none'))
    .groupBy(t.repo)
    .orderBy(desc(n), t.repo);
}
