import { z } from 'zod';

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export const ItemType = z.enum(['issue', 'pr', 'discussion']);
export type ItemType = z.infer<typeof ItemType>;

/** `merged` and `draft` only apply to PRs; discussions use `open`/`closed`. */
export const ItemState = z.enum(['open', 'closed', 'merged']);
export type ItemState = z.infer<typeof ItemState>;

/** How the user is involved in an item (GitHub `involves:` = union of these). */
export const Role = z.enum(['author', 'assigned', 'mentioned', 'commenter', 'reviewer']);
export type Role = z.infer<typeof Role>;

/** Local visibility state; `muted` auto-clears when activity newer than `mutedActivityAt` arrives. */
export const Hidden = z.enum(['none', 'muted', 'done']);
export type Hidden = z.infer<typeof Hidden>;

export const LinkedPr = z.object({
  number: z.number().int(),
  url: z.string().url(),
  state: ItemState,
  repo: z.string(),
});
export type LinkedPr = z.infer<typeof LinkedPr>;

export const Item = z.object({
  /** GitHub GraphQL node id. */
  id: z.string(),
  type: ItemType,
  number: z.number().int(),
  title: z.string(),
  url: z.string().url(),
  /** `owner/name` */
  repo: z.string(),
  owner: z.string(),
  state: ItemState,
  isDraft: z.boolean(),
  author: z.string(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
  roles: z.array(Role),
  commentCount: z.number().int(),
  /** PRs that reference/close this issue; empty for PRs and discussions. */
  linkedPrs: z.array(LinkedPr),
  /** Discussions only. */
  isAnswered: z.boolean().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  /** Last comment/review/edit the tracker knows of (GitHub `updatedAt` fallback). */
  lastActivityAt: z.string().datetime(),
  lastActivityBy: z.string().nullable(),
  hidden: Hidden,
  hiddenAt: z.string().datetime().nullable(),
  /** `lastActivityAt` at the moment of muting; activity after it un-mutes. */
  mutedActivityAt: z.string().datetime().nullable(),
  firstSeenAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime(),
});
export type Item = z.infer<typeof Item>;

export const Activity = z.object({
  id: z.string(),
  itemId: z.string(),
  kind: z.enum(['comment', 'review', 'commit', 'state', 'label', 'edit', 'reply', 'other']),
  actor: z.string().nullable(),
  summary: z.string(),
  url: z.string().url().nullable(),
  at: z.string().datetime(),
});
export type Activity = z.infer<typeof Activity>;

// ---------------------------------------------------------------------------
// Settings (settings table; every tunable lives here, never as a constant)
// ---------------------------------------------------------------------------

export const Theme = z.enum([
  'auto',
  'light',
  'light_colorblind',
  'light_tritanopia',
  'light_high_contrast',
  'dark',
  'dark_dimmed',
  'dark_colorblind',
  'dark_tritanopia',
  'dark_high_contrast',
]);
export type Theme = z.infer<typeof Theme>;

export const Settings = z.object({
  /** "Active" = activity within this many days. */
  activeWindowDays: z.number().int().min(1).max(365).default(30),
  pollIntervalMin: z.number().int().min(1).max(1440).default(15),
  /** Upper bound of the exponential backoff after GitHub failures. */
  backoffMaxMin: z.number().int().min(1).max(1440).default(120),
  /** Activity rows kept per item. */
  activityKeep: z.number().int().min(1).max(500).default(20),
  digestDaily: z.boolean().default(false),
  /** Local hour 0-23 for the daily digest. */
  digestHour: z.number().int().min(0).max(23).default(9),
  digestRealtime: z.boolean().default(false),
  /** Timezone for digestHour (IANA). */
  timezone: z.string().default('UTC'),
  discordWebhookUrl: z.string().url().startsWith('https://').or(z.literal('')).default(''),
  theme: Theme.default('auto'),
  /** Id of the view shown on load. */
  defaultView: z.string().default('active'),
});
export type Settings = z.infer<typeof Settings>;
export const SettingsPatch = Settings.partial();
export type SettingsPatch = z.infer<typeof SettingsPatch>;
export const DEFAULT_SETTINGS: Settings = Settings.parse({});

// ---------------------------------------------------------------------------
// Views (saved searches; built-ins are rows too, so adding one is data not code)
// ---------------------------------------------------------------------------

export const View = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  query: z.string(),
  builtin: z.boolean(),
  position: z.number().int(),
});
export type View = z.infer<typeof View>;

export const BUILTIN_VIEWS: View[] = [
  { id: 'active', name: 'Active', query: 'updated:>{activeWindowDays}d hidden:none', builtin: true, position: 0 },
  {
    id: 'needs-pr',
    name: 'Needs PR',
    query: 'is:open -is:pr -linked:pr hidden:none',
    builtin: true,
    position: 1,
  },
  { id: 'all', name: 'All', query: 'hidden:none', builtin: true, position: 2 },
  { id: 'hidden', name: 'Hidden', query: 'hidden:any', builtin: true, position: 3 },
];

// ---------------------------------------------------------------------------
// API envelopes: every action route answers {ok, message, ...data}
// ---------------------------------------------------------------------------

export type ApiOk<T extends object = Record<string, never>> = { ok: true; message: string } & T;
export type ApiErrKind = 'validation' | 'auth' | 'not_found' | 'upstream' | 'system';
export type ApiErr = { ok: false; message: string; kind: ApiErrKind };
export type ApiResult<T extends object = Record<string, never>> = ApiOk<T> | ApiErr;

export const SyncStatus = z.object({
  lastSyncAt: z.string().datetime().nullable(),
  lastSyncOk: z.boolean().nullable(),
  lastError: z.string().nullable(),
  nextSyncAt: z.string().datetime().nullable(),
  syncing: z.boolean(),
  githubLogin: z.string().nullable(),
  githubRateRemaining: z.number().int().nullable(),
  githubRateResetAt: z.string().datetime().nullable(),
  itemCount: z.number().int(),
});
export type SyncStatus = z.infer<typeof SyncStatus>;

export const Health = z.object({
  ok: z.boolean(),
  db: z.enum(['ok', 'error']),
  version: z.string(),
  lastSyncAt: z.string().datetime().nullable(),
  githubRateRemaining: z.number().int().nullable(),
});
export type Health = z.infer<typeof Health>;

export type ItemsResponse = ApiOk<{ items: Item[]; total: number; query: string }>;
export type ItemResponse = ApiOk<{ item: Item; activity: Activity[] }>;
export type ViewsResponse = ApiOk<{ views: View[] }>;
export type SettingsResponse = ApiOk<{ settings: Settings }>;
export type StatusResponse = ApiOk<{ status: SyncStatus }>;
export type ReposResponse = ApiOk<{ repos: { repo: string; count: number }[] }>;

/** Routes other code depends on. Changing a shape is a breaking change (major bump). */
export const API_ROUTES = {
  health: '/health',
  items: '/api/items',
  item: (id: string) => `/api/items/${encodeURIComponent(id)}`,
  mute: (id: string) => `/api/items/${encodeURIComponent(id)}/mute`,
  done: (id: string) => `/api/items/${encodeURIComponent(id)}/done`,
  restore: (id: string) => `/api/items/${encodeURIComponent(id)}/restore`,
  refresh: '/api/refresh',
  status: '/api/status',
  views: '/api/views',
  view: (id: string) => `/api/views/${encodeURIComponent(id)}`,
  settings: '/api/settings',
  repos: '/api/repos',
  testNotifier: (name: string) => `/api/notifiers/${encodeURIComponent(name)}/test`,
} as const;
