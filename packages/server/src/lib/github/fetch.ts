import type { Role } from '@octotally/shared';
import { log } from '../../log';
import { type GitHubClient, GitHubError } from './client';
import { mapDiscussion, mapIssue, mapPullRequest, type RemoteItem } from './map';
import {
  INVOLVED_DISCUSSIONS_QUERY,
  INVOLVED_ISSUES_QUERY,
  ISSUE_KINDS,
  involvesQuery,
  ROLE_IDS_QUERY,
  ROLE_SEARCHES,
  roleQuery,
  VIEWER_QUERY,
} from './queries';
import {
  DiscussionSearchPage,
  IssueSearchPage,
  isDiscussionNode,
  isIssueNode,
  isPullRequestNode,
  RoleIdsPage,
  ViewerPayload,
} from './schema';

/**
 * Safety cap on pagination, not a tunable: GitHub search stops at 1000 results anyway
 * (20 pages of 50); 40 leaves room if that ever rises. Hitting it is logged.
 */
export const MAX_PAGES = 40;
const PAGE_SIZE = 50;
const ROLE_PAGE_SIZE = 100;

export interface Snapshot {
  login: string;
  items: RemoteItem[];
  /** item id → roles from the role searches (author is derived from the node). */
  roles: Map<string, Set<Role>>;
  counts: Record<string, number>;
}

export async function fetchViewerLogin(gh: GitHubClient): Promise<string> {
  const { data } = await gh.query('viewer', VIEWER_QUERY);
  return parse(ViewerPayload, data, 'viewer').viewer.login;
}

/** Everything one sync needs. Fails fast on auth/rate-limit; validation failures surface as schema errors. */
export async function fetchSnapshot(gh: GitHubClient): Promise<Snapshot> {
  const logger = log('github');
  const login = await fetchViewerLogin(gh);
  const items: RemoteItem[] = [];
  const seen = new Set<string>();
  let unknownNodes = 0;

  for (const kind of ISSUE_KINDS) {
    const name = `involved:${kind}`;
    await paginate(name, async (after) => {
      const { data } = await gh.query(name, INVOLVED_ISSUES_QUERY, {
        q: involvesQuery(login, kind),
        first: PAGE_SIZE,
        after,
      });
      const page = parse(IssueSearchPage, data, name);
      for (const n of page.search.nodes) {
        if (!n) continue;
        if (isIssueNode(n)) push(mapIssue(n));
        else if (isPullRequestNode(n)) push(mapPullRequest(n));
        else unknownNodes += 1;
      }
      return page.search.pageInfo;
    });
  }

  await paginate('involvedDiscussions', async (after) => {
    const { data } = await gh.query('involvedDiscussions', INVOLVED_DISCUSSIONS_QUERY, {
      q: involvesQuery(login),
      first: PAGE_SIZE,
      after,
    });
    const page = parse(DiscussionSearchPage, data, 'involvedDiscussions');
    for (const n of page.search.nodes) {
      if (!n) continue;
      if (isDiscussionNode(n)) push(mapDiscussion(n));
      else unknownNodes += 1;
    }
    return page.search.pageInfo;
  });

  const roles = new Map<string, Set<Role>>();
  for (const it of items) {
    const set = new Set<Role>();
    if (it.author.toLowerCase() === login.toLowerCase()) set.add('author');
    if (it.assignees.some((a) => a.toLowerCase() === login.toLowerCase())) set.add('assigned');
    roles.set(it.id, set);
  }
  for (const rs of ROLE_SEARCHES) {
    const kinds = rs.type === 'DISCUSSION' ? [undefined] : (rs.kinds ?? ISSUE_KINDS);
    for (const kind of kinds) {
      const name = `role:${rs.qualifier}:${kind ?? 'discussion'}`;
      await paginate(name, async (after) => {
        const { data } = await gh.query(name, ROLE_IDS_QUERY, {
          q: roleQuery(rs.qualifier, login, kind),
          first: ROLE_PAGE_SIZE,
          after,
          type: rs.type,
        });
        const page = parse(RoleIdsPage, data, name);
        for (const n of page.search.nodes) {
          if (!n?.id) continue;
          const set = roles.get(n.id);
          if (set) set.add(rs.role);
        }
        return page.search.pageInfo;
      });
    }
  }
  // `involves:` = author ∪ assignee ∪ mentions ∪ commenter; anything left over is a mention we could not confirm.
  for (const set of roles.values()) if (set.size === 0) set.add('mentioned');

  const counts = {
    issues: items.filter((i) => i.type === 'issue').length,
    prs: items.filter((i) => i.type === 'pr').length,
    discussions: items.filter((i) => i.type === 'discussion').length,
    unknownNodes,
  };
  if (unknownNodes) logger.warn({ unknownNodes }, 'search returned nodes the schema does not model');
  return { login, items, roles, counts };

  function push(it: RemoteItem) {
    if (seen.has(it.id)) return;
    seen.add(it.id);
    items.push(it);
  }

  async function paginate(
    name: string,
    fn: (after: string | null) => Promise<{ hasNextPage: boolean; endCursor: string | null }>,
  ) {
    let after: string | null = null;
    for (let page = 1; ; page += 1) {
      const info = await fn(after);
      if (!info.hasNextPage || !info.endCursor) return;
      if (page >= MAX_PAGES) {
        logger.warn({ query: name, pages: page }, 'pagination safety cap reached; results truncated');
        return;
      }
      after = info.endCursor;
    }
  }
}

type Parser<T> = {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: { message: string } };
};
function parse<T>(schema: Parser<T>, data: unknown, name: string): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  throw new GitHubError(
    `GitHub payload for ${name} failed validation: ${r.error.message.slice(0, 500)}`,
    'schema',
  );
}
