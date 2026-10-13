import type { Activity, Hidden, Item } from '@octotally/shared';
import { Item as ItemSchema } from '@octotally/shared';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { activity as activityTable, items as itemsTable } from '../db/schema';

type ItemRow = typeof itemsTable.$inferSelect;

export function rowToItem(r: ItemRow): Item {
  return ItemSchema.parse({
    ...r,
    isAnswered: r.isAnswered ?? null,
    roles: r.roles,
  });
}

export function listItems(db: Db): Item[] {
  return db.select().from(itemsTable).all().map(rowToItem);
}

export function getItem(db: Db, id: string): Item | null {
  const r = db.select().from(itemsTable).where(eq(itemsTable.id, id)).get();
  return r ? rowToItem(r) : null;
}

export function countItems(db: Db): number {
  return db.select({ n: sql<number>`count(*)` }).from(itemsTable).get()?.n ?? 0;
}

export function listActivity(db: Db, itemId: string, limit = 100): Activity[] {
  return db
    .select()
    .from(activityTable)
    .where(eq(activityTable.itemId, itemId))
    .orderBy(desc(activityTable.at))
    .limit(limit)
    .all()
    .map(rowToActivity);
}

/** Activity the tracker noticed after `sinceSeenAt` (ISO), newest first, bounded. */
export function listActivitySince(db: Db, sinceSeenAt: string, limit = 500): Activity[] {
  return db
    .select()
    .from(activityTable)
    .where(gt(activityTable.seenAt, sinceSeenAt))
    .orderBy(desc(activityTable.at))
    .limit(limit)
    .all()
    .map(rowToActivity);
}

function rowToActivity(r: typeof activityTable.$inferSelect): Activity {
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
export function setHidden(db: Db, id: string, hidden: Hidden, now = new Date()): Item | null {
  const current = getItem(db, id);
  if (!current) return null;
  const iso = now.toISOString();
  db.update(itemsTable)
    .set({
      hidden,
      hiddenAt: hidden === 'none' ? null : iso,
      mutedActivityAt: hidden === 'muted' ? current.lastActivityAt : null,
    })
    .where(eq(itemsTable.id, id))
    .run();
  return getItem(db, id);
}

export function repoCounts(db: Db): { repo: string; count: number }[] {
  return db
    .select({ repo: itemsTable.repo, count: sql<number>`count(*)` })
    .from(itemsTable)
    .where(and(eq(itemsTable.hidden, 'none')))
    .groupBy(itemsTable.repo)
    .orderBy(desc(sql`count(*)`), itemsTable.repo)
    .all();
}
