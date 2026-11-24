import { tokenize } from '@octotally/shared';

/** Re-quotes a token whose value contains whitespace so it round-trips through `tokenize`. */
export function quoteToken(token: string): string {
  if (!/\s/.test(token)) return token;
  const colon = token.indexOf(':');
  const negated = token.startsWith('-') && colon > 0;
  const key = colon > 0 ? token.slice(0, colon) : null;
  if (key !== null && !/\s/.test(key)) return `${key}:"${token.slice(colon + 1)}"`;
  return `${negated ? '-' : ''}"${negated ? token.slice(1) : token}"`;
}

export function joinTokens(tokens: string[]): string {
  return tokens.map(quoteToken).join(' ');
}

function splitToken(token: string): { key: string | null; value: string; negated: boolean } {
  const negated = token.startsWith('-') && token.includes(':');
  const body = negated ? token.slice(1) : token;
  const colon = body.indexOf(':');
  if (colon <= 0) return { key: null, value: body, negated: false };
  return { key: body.slice(0, colon).toLowerCase(), value: body.slice(colon + 1), negated };
}

export function hasToken(query: string, token: string): boolean {
  const want = token.toLowerCase();
  return tokenize(query).some((t) => t.toLowerCase() === want);
}

export function removeToken(query: string, token: string): string {
  const want = token.toLowerCase();
  return joinTokens(tokenize(query).filter((t) => t.toLowerCase() !== want));
}

export function addToken(query: string, token: string): string {
  if (hasToken(query, token)) return query;
  return joinTokens([...tokenize(query), token]);
}

export function toggleToken(query: string, token: string): string {
  return hasToken(query, token) ? removeToken(query, token) : addToken(query, token);
}

/** Keys that mean one thing per query: setting a new value replaces the old one(s). */
export function setSingleQualifier(query: string, key: string, value: string | null): string {
  const k = key.toLowerCase();
  const rest = tokenize(query).filter((t) => {
    const s = splitToken(t);
    return s.key !== k;
  });
  if (value !== null) rest.push(`${key}:${value}`);
  return joinTokens(rest);
}

/** Current value(s) for a key (e.g. `updated` → ['>7d']). */
export function qualifierValues(query: string, key: string): string[] {
  const k = key.toLowerCase();
  return tokenize(query)
    .map(splitToken)
    .filter((s) => s.key === k && !s.negated)
    .map((s) => s.value);
}

/** What a qualifier filters by: the line under each of its values in the filter field. */
const QUALIFIER_HELP: Record<string, string> = {
  is: 'State or kind',
  type: 'Kind',
  state: 'State',
  author: 'Opened by',
  assignee: 'Assigned to',
  mentions: 'Mentions',
  commenter: 'Commented by',
  reviewer: 'Review asked of',
  role: 'How you are part of it',
  no: 'Has none',
  linked: 'Has a linked pull request',
  updated: 'Last activity, relative (7d = 7 days)',
  created: 'Opened, relative',
  activity: 'Last activity, relative',
  comments: 'Number of comments',
  hidden: 'Done or muted here',
  sort: 'Order of the list',
};

const VALUE_OPTIONS: Record<string, string[]> = {
  is: ['open', 'closed', 'merged', 'draft', 'issue', 'pr', 'discussion', 'answered', 'unanswered'],
  type: ['issue', 'pr', 'discussion'],
  state: ['open', 'closed', 'merged'],
  role: ['author', 'assigned', 'mentioned', 'commenter', 'reviewer'],
  no: ['label', 'assignee', 'linked'],
  linked: ['pr'],
  hidden: ['none', 'muted', 'done', 'any'],
  sort: ['updated-desc', 'updated-asc', 'created-desc', 'created-asc', 'comments-desc'],
  updated: ['>1d', '>7d', '>30d', '>90d', '<30d'],
  created: ['>7d', '>30d', '<30d', '<1y'],
  activity: ['>1d', '>7d', '>30d', '>90d'],
  comments: ['>0', '>5', '>10', '=0'],
  author: ['@me'],
  assignee: ['@me'],
  mentions: ['@me'],
  commenter: ['@me'],
  reviewer: ['@me'],
};

export interface TokenOption {
  /** The token, as `tokenize` returns it. */
  value: string;
  /** The token as typed (quoted when it holds a space). */
  label: string;
  description?: string;
}

const countText = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

/** Every token the filter field offers: the qualifier values it knows, and the repositories, owners and labels seen. */
export function tokenOptions(
  ctx: { repos?: { repo: string; count: number }[]; labels?: [string, number][] } = {},
): TokenOption[] {
  const out = new Map<string, TokenOption>();
  const add = (token: string, description?: string) => {
    if (!out.has(token)) out.set(token, { value: token, label: quoteToken(token), description });
  };
  for (const [key, values] of Object.entries(VALUE_OPTIONS))
    for (const value of values) add(`${key}:${value}`, QUALIFIER_HELP[key]);
  const repos = ctx.repos ?? [];
  for (const { repo, count } of repos) add(`repo:${repo}`, countText(count));
  const owners = new Map<string, number>();
  for (const { repo, count } of repos) {
    const owner = repo.split('/')[0] ?? repo;
    owners.set(owner, (owners.get(owner) ?? 0) + count);
  }
  for (const [owner, count] of owners) add(`org:${owner}`, countText(count));
  for (const [label, count] of ctx.labels ?? []) add(`label:${label}`, countText(count));
  return [...out.values()];
}
