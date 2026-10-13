// Mock API for developing the SPA without a GitHub token.
// Run: bun packages/web/mock/server.ts   (port 3001; MOCK_PORT overrides)
// Then: VITE_API_TARGET=http://localhost:3001 bun run --filter @octotally/web dev
import type { Activity, Item, Settings, SyncStatus, View } from '@octotally/shared';
import { applySearch, BUILTIN_VIEWS, DEFAULT_SETTINGS } from '@octotally/shared';

const port = Number(process.env.MOCK_PORT ?? 3001);
const now = Date.now();
const H = 3_600_000;
const D = 24 * H;
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const REPOS = [
  'octocat/hello-world',
  'primer/react',
  'oven-sh/bun',
  'honojs/hono',
  'drizzle-team/drizzle-orm',
  'vitejs/vite',
];
const PEOPLE = ['maziggy', 'octocat', 'hubot', 'monalisa', 'defunkt', 'mojombo'];
const LABELS = [
  'bug',
  'enhancement',
  'help wanted',
  'good first issue',
  'documentation',
  'question',
  'area: ui',
];
const TITLES = [
  'Search bar loses focus after pressing Escape twice',
  'Add dark_dimmed support to the settings page',
  'Rate limit handling should back off exponentially',
  'Linked PRs are not detected for cross-repo references',
  'Discussion answers are counted as comments',
  'Make the poll interval configurable per repository',
  'Flaky test: relativeTime around DST changes',
  'Proposal: MCP endpoint for pending items',
  'Docker image fails to start with a read-only data dir',
  'Keyboard shortcuts conflict with browser find',
  'Expose /metrics for Prometheus',
  'Digest should group items by repository',
  'Timeline does not render review events',
  'Allow muting a whole repository',
  'Fine-grained PAT returns 403 on discussions',
  'Sidebar counts are stale after mute',
  'Support GitHub Enterprise Server hosts',
  'Auto-restore muted items on new activity',
  'Improve empty state copy',
  'Label colours from GitHub',
  'Render markdown in activity summaries',
  'Replace hand-rolled router with history API wrapper',
  'Nightly build broken on arm64',
  'Add CONTRIBUTING guide',
  'Theme flashes on first paint when cached theme is dark',
];

function makeItem(i: number): Item {
  const type: Item['type'] = i % 5 === 0 ? 'discussion' : i % 3 === 0 ? 'pr' : 'issue';
  const repo = REPOS[i % REPOS.length] as string;
  const owner = repo.split('/')[0] as string;
  const state: Item['state'] = type === 'pr' && i % 9 === 0 ? 'merged' : i % 7 === 0 ? 'closed' : 'open';
  const activityAgo = (i * 7) % 60 === 0 ? 40 * D : ((i * 11) % 50) * H + i * 13 * 60_000;
  const createdAgo = activityAgo + ((i * 3) % 40) * D + D;
  const author = PEOPLE[i % PEOPLE.length] as string;
  const roles: Item['roles'] = [];
  if (i % 4 === 0) roles.push('author');
  if (i % 3 === 1) roles.push('mentioned');
  if (i % 5 === 2) roles.push('assigned');
  if (type === 'pr' && i % 2 === 0) roles.push('reviewer');
  if (!roles.length) roles.push('commenter');
  const linkedPrs: Item['linkedPrs'] =
    type === 'issue' && i % 4 === 1
      ? [
          {
            number: 100 + i,
            url: `https://github.com/${repo}/pull/${100 + i}`,
            state: i % 8 === 1 ? 'merged' : 'open',
            repo,
          },
        ]
      : [];
  const hidden: Item['hidden'] = i % 11 === 10 ? 'muted' : i % 13 === 12 ? 'done' : 'none';
  const commentCount = (i * 7) % 23;
  return {
    id: `MOCK_${i}`,
    type,
    number: 1000 + i * 3,
    title: TITLES[i % TITLES.length] as string,
    url: `https://github.com/${repo}/${type === 'pr' ? 'pull' : type === 'discussion' ? 'discussions' : 'issues'}/${1000 + i * 3}`,
    repo,
    owner,
    state,
    isDraft: type === 'pr' && i % 6 === 3,
    author,
    labels: [
      LABELS[i % LABELS.length] as string,
      ...(i % 3 === 0 ? [LABELS[(i + 2) % LABELS.length] as string] : []),
    ],
    assignees: i % 5 === 2 ? ['maziggy'] : [],
    roles,
    commentCount,
    linkedPrs,
    isAnswered: type === 'discussion' ? i % 10 === 5 : null,
    createdAt: iso(createdAgo),
    updatedAt: iso(activityAgo),
    lastActivityAt: iso(activityAgo),
    lastActivityBy: commentCount ? (PEOPLE[(i + 1) % PEOPLE.length] as string) : author,
    hidden,
    hiddenAt: hidden === 'none' ? null : iso(2 * D),
    mutedActivityAt: hidden === 'muted' ? iso(activityAgo) : null,
    firstSeenAt: iso(createdAgo),
    lastSyncedAt: iso(5 * 60_000),
  };
}

const items: Item[] = Array.from({ length: 25 }, (_, i) => makeItem(i));
let settings: Settings = {
  ...DEFAULT_SETTINGS,
  theme: (process.env.MOCK_THEME as Settings['theme']) ?? 'auto',
};
let views: View[] = [
  ...BUILTIN_VIEWS,
  { id: 'bugs', name: 'Bugs', query: 'is:open label:bug hidden:none', builtin: false, position: 10 },
];
let status: SyncStatus = {
  lastSyncAt: iso(6 * 60_000),
  lastSyncOk: true,
  lastError: null,
  nextSyncAt: new Date(now + 9 * 60_000).toISOString(),
  syncing: false,
  githubLogin: 'maziggy',
  githubRateRemaining: 4821,
  githubRateResetAt: new Date(now + 40 * 60_000).toISOString(),
  itemCount: items.length,
};

const activityFor = (item: Item): Activity[] =>
  Array.from({ length: Math.min(6, item.commentCount + 1) }, (_, k) => ({
    id: `${item.id}_a${k}`,
    itemId: item.id,
    kind: k === 0 ? 'state' : k % 3 === 0 ? 'review' : 'comment',
    actor: PEOPLE[(k + item.number) % PEOPLE.length] as string,
    summary: k === 0 ? 'opened this' : k % 3 === 0 ? 'approved these changes' : 'commented',
    url: `${item.url}#event-${k}`,
    at: new Date(Date.parse(item.lastActivityAt) - k * 5 * H).toISOString(),
  })).reverse();

const json = (data: object, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), { ...init, headers: { 'content-type': 'application/json' } });
const ok = (message: string, data: object = {}) => json({ ok: true, message, ...data });
const err = (message: string, kind: string, statusCode: number) =>
  json({ ok: false, message, kind }, { status: statusCode });

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const p = url.pathname;
    const m = req.method;
    console.log(`[mock] ${m} ${p}${url.search}`);

    if (p === '/health')
      return json({
        ok: true,
        db: 'ok',
        version: 'mock',
        lastSyncAt: status.lastSyncAt,
        githubRateRemaining: 4821,
      });
    if (p === '/auth/status')
      return ok('ok', { authenticated: true, required: process.env.MOCK_AUTH === '1' });
    if (p === '/auth/login') return ok('logged in');
    if (p === '/auth/logout') return ok('logged out');

    if (p === '/api/items' && m === 'GET') {
      const q = url.searchParams.get('q') ?? '';
      const result = applySearch(items, q, { settings, me: 'maziggy' });
      return ok('ok', { items: result, total: result.length, query: q });
    }
    const itemMatch = /^\/api\/items\/([^/]+)(?:\/(mute|done|restore))?$/.exec(p);
    if (itemMatch) {
      const item = items.find((i) => i.id === decodeURIComponent(itemMatch[1] as string));
      if (!item) return err('Item not found', 'not_found', 404);
      const action = itemMatch[2];
      if (!action) return ok('ok', { item, activity: activityFor(item) });
      if (m !== 'POST') return err('Method not allowed', 'validation', 405);
      item.hidden = action === 'mute' ? 'muted' : action === 'done' ? 'done' : 'none';
      item.hiddenAt = item.hidden === 'none' ? null : new Date().toISOString();
      item.mutedActivityAt = item.hidden === 'muted' ? item.lastActivityAt : null;
      return ok(`Item ${action}d`, { item });
    }
    if (p === '/api/refresh') {
      status = { ...status, syncing: true };
      setTimeout(() => {
        status = {
          ...status,
          syncing: false,
          lastSyncAt: new Date().toISOString(),
          nextSyncAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        };
      }, 2500);
      return ok('Sync started');
    }
    if (p === '/api/status') return ok('ok', { status });
    if (p === '/api/views' && m === 'GET') return ok('ok', { views });
    if (p === '/api/views' && m === 'POST') {
      const body = (await req.json()) as { name: string; query: string };
      const view: View = {
        id: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: body.name,
        query: body.query,
        builtin: false,
        position: views.length,
      };
      views = [...views, view];
      return ok('View created', { view });
    }
    const viewMatch = /^\/api\/views\/([^/]+)$/.exec(p);
    if (viewMatch) {
      const id = decodeURIComponent(viewMatch[1] as string);
      const view = views.find((v) => v.id === id);
      if (!view) return err('View not found', 'not_found', 404);
      if (m === 'DELETE') {
        if (view.builtin) return err('Built-in views cannot be deleted', 'validation', 400);
        views = views.filter((v) => v.id !== id);
        return ok('View deleted');
      }
      if (m === 'PUT') {
        Object.assign(view, await req.json());
        return ok('View updated', { view });
      }
    }
    if (p === '/api/settings' && m === 'GET') return ok('ok', { settings });
    if (p === '/api/settings' && m === 'PUT') {
      settings = { ...settings, ...((await req.json()) as Partial<Settings>) };
      return ok('Settings saved', { settings });
    }
    if (p === '/api/repos') {
      const counts = new Map<string, number>();
      for (const i of items) counts.set(i.repo, (counts.get(i.repo) ?? 0) + 1);
      return ok('ok', {
        repos: [...counts].map(([repo, count]) => ({ repo, count })).sort((a, b) => b.count - a.count),
      });
    }
    if (p === '/api/notifiers/discord/test') {
      return settings.discordWebhookUrl
        ? ok('Test message sent')
        : err('No webhook configured', 'validation', 400);
    }
    return err(`No mock for ${m} ${p}`, 'not_found', 404);
  },
});

console.log(`[mock] Octotally mock API on http://localhost:${port} (${items.length} items)`);
