import { boolean, index, integer, jsonb, pgSchema, pgTable, text } from 'drizzle-orm/pg-core';

/**
 * Postgres mirror of `schema.ts`: same tables, column names and TypeScript row types (checked in
 * `db/index.ts`), so one set of queries runs on both engines. Timestamps stay ISO text like on SQLite;
 * booleans and JSON use the native types.
 *
 * Built per schema so every query names it (`"octotally"."items"`): no reliance on `search_path`,
 * which poolers in transaction mode do not keep. `schema = null` gives unqualified tables, used by
 * drizzle-kit to write the migrations, which the migrator then runs inside the target schema.
 */
export function createPgTables(schema: string | null) {
  const table = (schema ? pgSchema(schema).table : pgTable) as typeof pgTable;

  const items = table(
    'items',
    {
      id: text('id').primaryKey(),
      type: text('type').notNull(),
      number: integer('number').notNull(),
      title: text('title').notNull(),
      url: text('url').notNull(),
      repo: text('repo').notNull(),
      owner: text('owner').notNull(),
      state: text('state').notNull(),
      isDraft: boolean('is_draft').notNull().default(false),
      author: text('author').notNull(),
      labels: jsonb('labels').$type<string[]>().notNull().default([]),
      assignees: jsonb('assignees').$type<string[]>().notNull().default([]),
      roles: jsonb('roles').$type<string[]>().notNull().default([]),
      commentCount: integer('comment_count').notNull().default(0),
      linkedPrs: jsonb('linked_prs')
        .$type<{ number: number; url: string; state: string; repo: string }[]>()
        .notNull()
        .default([]),
      isAnswered: boolean('is_answered'),
      createdAt: text('created_at').notNull(),
      updatedAt: text('updated_at').notNull(),
      lastActivityAt: text('last_activity_at').notNull(),
      lastActivityBy: text('last_activity_by'),
      hidden: text('hidden').notNull().default('none'),
      hiddenAt: text('hidden_at'),
      mutedActivityAt: text('muted_activity_at'),
      firstSeenAt: text('first_seen_at').notNull(),
      lastSyncedAt: text('last_synced_at').notNull(),
    },
    (t) => [index('items_repo_idx').on(t.repo), index('items_last_activity_idx').on(t.lastActivityAt)],
  );

  const activity = table(
    'activity',
    {
      id: text('id').primaryKey(),
      itemId: text('item_id')
        .notNull()
        .references(() => items.id, { onDelete: 'cascade' }),
      kind: text('kind').notNull(),
      actor: text('actor'),
      summary: text('summary').notNull(),
      url: text('url'),
      at: text('at').notNull(),
      seenAt: text('seen_at').notNull(),
    },
    (t) => [index('activity_item_idx').on(t.itemId, t.at), index('activity_seen_idx').on(t.seenAt)],
  );

  const settings = table('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull(),
  });

  const views = table('views', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    query: text('query').notNull(),
    builtin: boolean('builtin').notNull().default(false),
    position: integer('position').notNull().default(0),
  });

  const digests = table(
    'digests',
    {
      id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
      sentAt: text('sent_at').notNull(),
      kind: text('kind').notNull(),
      notifier: text('notifier').notNull(),
      payloadHash: text('payload_hash').notNull(),
    },
    (t) => [index('digests_kind_idx').on(t.kind, t.sentAt), index('digests_hash_idx').on(t.payloadHash)],
  );

  const syncRuns = table(
    'sync_runs',
    {
      id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
      startedAt: text('started_at').notNull(),
      finishedAt: text('finished_at'),
      ok: boolean('ok'),
      error: text('error'),
      rateRemaining: integer('rate_remaining'),
      rateResetAt: text('rate_reset_at'),
      githubLogin: text('github_login'),
      counts: jsonb('counts').$type<Record<string, number>>(),
    },
    (t) => [index('sync_runs_started_idx').on(t.startedAt)],
  );

  return { items, activity, settings, views, digests, syncRuns };
}

export type PgTables = ReturnType<typeof createPgTables>;

// drizzle-kit reads these exports.
export const { items, activity, settings, views, digests, syncRuns } = createPgTables(null);
