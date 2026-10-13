import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** One row per GitHub issue / PR / discussion ever seen. Rows are never deleted; local state lives here too. */
export const items = sqliteTable(
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
    isDraft: integer('is_draft', { mode: 'boolean' }).notNull().default(false),
    author: text('author').notNull(),
    labels: text('labels', { mode: 'json' }).$type<string[]>().notNull().default([]),
    assignees: text('assignees', { mode: 'json' }).$type<string[]>().notNull().default([]),
    roles: text('roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
    commentCount: integer('comment_count').notNull().default(0),
    linkedPrs: text('linked_prs', { mode: 'json' })
      .$type<{ number: number; url: string; state: string; repo: string }[]>()
      .notNull()
      .default([]),
    isAnswered: integer('is_answered', { mode: 'boolean' }),
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

export const activity = sqliteTable(
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
    /** When the tracker noticed it (digests are cut by this, not by `at`). */
    seenAt: text('seen_at').notNull(),
  },
  (t) => [index('activity_item_idx').on(t.itemId, t.at), index('activity_seen_idx').on(t.seenAt)],
);

/** key → JSON value; shape validated by the shared `Settings` schema. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const views = sqliteTable('views', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  query: text('query').notNull(),
  builtin: integer('builtin', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
});

export const digests = sqliteTable(
  'digests',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sentAt: text('sent_at').notNull(),
    kind: text('kind').notNull(),
    notifier: text('notifier').notNull(),
    payloadHash: text('payload_hash').notNull(),
  },
  (t) => [index('digests_kind_idx').on(t.kind, t.sentAt), index('digests_hash_idx').on(t.payloadHash)],
);

export const syncRuns = sqliteTable(
  'sync_runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    ok: integer('ok', { mode: 'boolean' }),
    error: text('error'),
    rateRemaining: integer('rate_remaining'),
    rateResetAt: text('rate_reset_at'),
    githubLogin: text('github_login'),
    counts: text('counts', { mode: 'json' }).$type<Record<string, number>>(),
  },
  (t) => [index('sync_runs_started_idx').on(t.startedAt)],
);
