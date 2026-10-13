import { z } from 'zod';

/** Shapes of the GraphQL payloads we persist. Anything else GitHub sends is ignored. */

const Actor = z.object({ login: z.string() }).nullable();
const Repo = z.object({ nameWithOwner: z.string(), owner: z.object({ login: z.string() }) });
const Labels = z.object({ nodes: z.array(z.object({ name: z.string() }).nullable()) });
const Assignees = z.object({ nodes: z.array(z.object({ login: z.string() }).nullable()) });
const LastComment = z.object({ author: Actor, createdAt: z.string(), url: z.string() });
const Comments = z.object({ totalCount: z.number().int(), nodes: z.array(LastComment.nullable()) });

export const IssueNode = z.object({
  __typename: z.literal('Issue'),
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  repository: Repo,
  state: z.enum(['OPEN', 'CLOSED']),
  author: Actor,
  labels: Labels.nullable(),
  assignees: Assignees,
  comments: Comments,
  createdAt: z.string(),
  updatedAt: z.string(),
  closedByPullRequestsReferences: z
    .object({
      nodes: z.array(
        z
          .object({
            number: z.number().int(),
            url: z.string(),
            state: z.enum(['OPEN', 'CLOSED', 'MERGED']),
            repository: z.object({ nameWithOwner: z.string() }),
          })
          .nullable(),
      ),
    })
    .nullable(),
});
export type IssueNode = z.infer<typeof IssueNode>;

export const PullRequestNode = z.object({
  __typename: z.literal('PullRequest'),
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  repository: Repo,
  state: z.enum(['OPEN', 'CLOSED', 'MERGED']),
  isDraft: z.boolean(),
  author: Actor,
  labels: Labels.nullable(),
  assignees: Assignees,
  comments: Comments,
  reviews: z
    .object({
      nodes: z.array(
        z
          .object({ author: Actor, submittedAt: z.string().nullable(), url: z.string(), state: z.string() })
          .nullable(),
      ),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PullRequestNode = z.infer<typeof PullRequestNode>;

export const DiscussionNode = z.object({
  __typename: z.literal('Discussion'),
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.string(),
  repository: Repo,
  closed: z.boolean(),
  isAnswered: z.boolean().nullable(),
  author: Actor,
  labels: Labels.nullable(),
  comments: Comments,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DiscussionNode = z.infer<typeof DiscussionNode>;

const PageInfo = z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() });

/** Nodes are classified one by one in fetch.ts (`isIssueNode` …) so one odd node never fails the page. */
export const IssueSearchPage = z.object({
  search: z.object({
    issueCount: z.number().int().optional(),
    pageInfo: PageInfo,
    nodes: z.array(z.unknown()),
  }),
});
export type IssueSearchPage = z.infer<typeof IssueSearchPage>;

export const DiscussionSearchPage = z.object({
  search: z.object({
    discussionCount: z.number().int().optional(),
    pageInfo: PageInfo,
    nodes: z.array(z.unknown()),
  }),
});
export type DiscussionSearchPage = z.infer<typeof DiscussionSearchPage>;

export const RoleIdsPage = z.object({
  search: z.object({
    pageInfo: PageInfo,
    nodes: z.array(z.object({ id: z.string().optional() }).passthrough().nullable()),
  }),
});
export type RoleIdsPage = z.infer<typeof RoleIdsPage>;

export const ViewerPayload = z.object({ viewer: z.object({ login: z.string() }) });

export function isIssueNode(n: unknown): n is IssueNode {
  return IssueNode.safeParse(n).success;
}
export function isPullRequestNode(n: unknown): n is PullRequestNode {
  return PullRequestNode.safeParse(n).success;
}
export function isDiscussionNode(n: unknown): n is DiscussionNode {
  return DiscussionNode.safeParse(n).success;
}
