import { BUILTIN_VIEWS, Settings, SettingsPatch, type View } from '@octotally/shared';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db';

/** Current settings: stored rows merged over the schema defaults. Read at use time, never cached. */
export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.orm.select().from(db.t.settings);
  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      raw[row.key] = JSON.parse(row.value);
    } catch {
      // Unparseable value: fall back to the default for that key.
    }
  }
  const parsed = Settings.safeParse(raw);
  if (parsed.success) return parsed.data;
  // One bad value must not take every setting down: drop the offending keys and re-parse.
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string') delete raw[key];
  }
  return Settings.parse(raw);
}

/** Validates with `SettingsPatch` (throws ZodError on bad input) and upserts each key. */
export async function patchSettings(db: Db, patch: unknown): Promise<Settings> {
  const valid = SettingsPatch.parse(patch);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(valid)) {
      if (value === undefined) continue;
      await tx.orm
        .insert(tx.t.settings)
        .values({ key, value: JSON.stringify(value), updatedAt: now })
        .onConflictDoUpdate({
          target: tx.t.settings.key,
          set: { value: sql`excluded.value`, updatedAt: now },
        });
    }
  });
  return getSettings(db);
}

/** Inserts the built-in views that are missing; never overwrites a user's rename/reorder. */
export async function seedViews(db: Db): Promise<void> {
  for (const v of BUILTIN_VIEWS) {
    await db.orm.insert(db.t.views).values(v).onConflictDoNothing();
  }
}

export async function listViews(db: Db): Promise<View[]> {
  return db.orm.select().from(db.t.views).orderBy(db.t.views.position, db.t.views.id);
}

export async function getView(db: Db, id: string): Promise<View | null> {
  const [v] = await db.orm.select().from(db.t.views).where(eq(db.t.views.id, id)).limit(1);
  return v ?? null;
}
