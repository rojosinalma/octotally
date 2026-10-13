import { BUILTIN_VIEWS, Settings, SettingsPatch, type View } from '@octotally/shared';
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { settings as settingsTable, views as viewsTable } from '../db/schema';

/** Current settings: stored rows merged over the schema defaults. Read at use time, never cached. */
export function getSettings(db: Db): Settings {
  const rows = db.select().from(settingsTable).all();
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
export function patchSettings(db: Db, patch: unknown): Settings {
  const valid = SettingsPatch.parse(patch);
  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(valid)) {
      if (value === undefined) continue;
      tx.insert(settingsTable)
        .values({ key, value: JSON.stringify(value), updatedAt: now })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value: sql`excluded.value`, updatedAt: now },
        })
        .run();
    }
  });
  return getSettings(db);
}

/** Inserts the built-in views that are missing; never overwrites a user's rename/reorder. */
export function seedViews(db: Db): void {
  for (const v of BUILTIN_VIEWS) {
    db.insert(viewsTable).values(v).onConflictDoNothing().run();
  }
}

export function listViews(db: Db): View[] {
  return db.select().from(viewsTable).orderBy(viewsTable.position, viewsTable.id).all();
}

export function getView(db: Db, id: string): View | null {
  return db.select().from(viewsTable).where(eq(viewsTable.id, id)).get() ?? null;
}
