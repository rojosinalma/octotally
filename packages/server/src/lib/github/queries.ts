/** GraphQL documents. Every one selects `rateLimit` so the client can log cost + remaining. */

const RATE = 'rateLimit { cost remaining limit resetAt }';

export const VIEWER_QUERY = `query Viewer { viewer { login } ${RATE} }`;

const ISSUE_FIELDS = `
  id number title url
  repository { nameWithOwner owner { login } }
  state
  author { login }
  labels(first: 20) { nodes { name } }
  assignees(first: 10) { nodes { login } }
  comments(last: 1) { totalCount nodes { author { login } createdAt url } }
  createdAt updatedAt
  closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
    nodes { number url state repository { nameWithOwner } }
  }
`;

const PR_FIELDS = `
  id number title url
  repository { nameWithOwner owner { login } }
  state isDraft
  author { login }
  labels(first: 20) { nodes { name } }
  assignees(first: 10) { nodes { login } }
  comments(last: 1) { totalCount nodes { author { login } createdAt url } }
  reviews(last: 1) { nodes { author { login } submittedAt url state } }
  createdAt updatedAt
`;

const DISCUSSION_FIELDS = `
  id number title url
  repository { nameWithOwner owner { login } }
  closed isAnswered
  author { login }
  labels(first: 20) { nodes { name } }
  comments(last: 1) { totalCount nodes { author { login } createdAt url } }
  createdAt updatedAt
`;

/** Issues + PRs the user is involved in, newest activity first. */
export const INVOLVED_ISSUES_QUERY = `
query InvolvedIssues($q: String!, $first: Int!, $after: String) {
  search(type: ISSUE_ADVANCED, query: $q, first: $first, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes {
      __typename
      ... on Issue { ${ISSUE_FIELDS} }
      ... on PullRequest { ${PR_FIELDS} }
    }
  }
  ${RATE}
}`;

export const INVOLVED_DISCUSSIONS_QUERY = `
query InvolvedDiscussions($q: String!, $first: Int!, $after: String) {
  search(type: DISCUSSION, query: $q, first: $first, after: $after) {
    discussionCount
    pageInfo { hasNextPage endCursor }
    nodes { __typename ... on Discussion { ${DISCUSSION_FIELDS} } }
  }
  ${RATE}
}`;

/** Ids only: used once per role qualifier to derive the user's roles on each item. */
export const ROLE_IDS_QUERY = `
query RoleIds($q: String!, $first: Int!, $after: String, $type: SearchType!) {
  search(type: $type, query: $q, first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { __typename ... on Node { id } }
  }
  ${RATE}
}`;

/** Search qualifiers that establish a role, per search type. Author is read from the node itself. */
export const ROLE_SEARCHES: {
  role: 'assigned' | 'mentioned' | 'commenter' | 'reviewer';
  qualifier: string;
  type: 'ISSUE_ADVANCED' | 'DISCUSSION';
}[] = [
  { role: 'assigned', qualifier: 'assignee', type: 'ISSUE_ADVANCED' },
  { role: 'mentioned', qualifier: 'mentions', type: 'ISSUE_ADVANCED' },
  { role: 'commenter', qualifier: 'commenter', type: 'ISSUE_ADVANCED' },
  { role: 'reviewer', qualifier: 'review-requested', type: 'ISSUE_ADVANCED' },
  { role: 'reviewer', qualifier: 'reviewed-by', type: 'ISSUE_ADVANCED' },
  { role: 'commenter', qualifier: 'commenter', type: 'DISCUSSION' },
];

export function involvesQuery(login: string): string {
  return `involves:${login} sort:updated-desc`;
}

export function roleQuery(qualifier: string, login: string): string {
  return `${qualifier}:${login} sort:updated-desc`;
}
