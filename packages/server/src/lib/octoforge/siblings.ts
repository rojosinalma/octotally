import { OctoforgeSiblings, type SiblingsView } from '@octotally/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { log } from '../../log';
import { MANIFEST } from './manifest';

/**
 * The sibling list Octoforge pushes (`PUT /api/octoforge/siblings`), kept in the settings table
 * under a key the shared `Settings` schema does not know, so `GET/PUT /api/settings` never touch it.
 */
export const SIBLINGS_KEY = 'octoforge.siblings';

interface Stored {
  list: OctoforgeSiblings;
  received_at: string;
}

export async function saveSiblings(db: Db, list: OctoforgeSiblings): Promise<void> {
  const now = new Date().toISOString();
  const value = JSON.stringify({ list, received_at: now } satisfies Stored);
  const settings = db.t.settings;
  await db.orm
    .insert(settings)
    .values({ key: SIBLINGS_KEY, value, updatedAt: now })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
}

/** Drops the stored list; `true` when there was one. */
export async function clearSiblings(db: Db): Promise<boolean> {
  const settings = db.t.settings;
  const rows = await db.orm
    .delete(settings)
    .where(eq(settings.key, SIBLINGS_KEY))
    .returning({ key: settings.key });
  return rows.length > 0;
}

/** The stored list for the UI, or `null` when there is none or it no longer validates (logged). */
export async function loadSiblings(db: Db): Promise<SiblingsView | null> {
  const settings = db.t.settings;
  const [row] = await db.orm
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SIBLINGS_KEY))
    .limit(1);
  if (!row) return null;
  try {
    const stored = JSON.parse(row.value) as Partial<Stored>;
    const list = OctoforgeSiblings.parse(stored.list);
    const received_at = typeof stored.received_at === 'string' ? stored.received_at : list.updated_at;
    return { ...list, self: MANIFEST.name, received_at };
  } catch {
    log('octoforge').warn({ key: SIBLINGS_KEY }, 'stored sibling list is malformed; switcher hidden');
    return null;
  }
}
