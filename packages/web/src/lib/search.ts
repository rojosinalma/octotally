import { parseSearch, QUALIFIERS, tokenize } from '@octotally/shared';

export interface Chip {
  /** Exact token as it appears in the query (unquoted). */
  token: string;
  kind: 'qualifier' | 'text' | 'unknown';
  key?: string;
  value?: string;
  negated: boolean;
  /** Human label, e.g. `-is:pr`, `label:bug`, `"my search"`. */
  label: string;
}

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

/** Chips for the active-filter strip; unknown tokens are flagged so the UI can warn inline. */
export function chipsFromQuery(query: string): Chip[] {
  const parsed = parseSearch(query);
  const unknown = new Set(parsed.unknown);
  return tokenize(query).map((token) => {
    const { key, value, negated } = splitToken(token);
    if (key === null) return { token, kind: 'text', negated: false, label: `"${value}"` };
    if (unknown.has(token)) return { token, kind: 'unknown', key, value, negated, label: quoteToken(token) };
    return { token, kind: 'qualifier', key, value, negated, label: quoteToken(token) };
  });
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

export interface Suggestion {
  /** Full token to insert in place of the current partial one. */
  insert: string;
  label: string;
  description?: string;
}

export interface SuggestContext {
  repos?: string[];
  labels?: string[];
  owners?: string[];
}

const QUALIFIER_HELP: Record<string, string> = {
  is: 'open, closed, merged, draft, issue, pr, discussion, answered, unanswered',
  type: 'issue, pr, discussion',
  state: 'open, closed, merged',
  repo: 'owner/name',
  org: 'owner',
  author: 'login or @me',
  assignee: 'login or @me',
  mentions: '@me',
  commenter: '@me',
  reviewer: '@me',
  role: 'author, assigned, mentioned, commenter, reviewer',
  label: 'label name',
  no: 'label, assignee, linked',
  linked: 'pr',
  updated: '>7d, <2w, 2026-01-01..2026-02-01',
  created: '>7d, <2w, >=2026-01-01',
  activity: '>7d (same as updated)',
  comments: '>5, <=1',
  hidden: 'none, muted, done, any',
  sort: 'updated-desc, updated-asc, created-desc, created-asc, comments-desc',
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

/** Autocomplete for the last (partial) token of the query; `null` when nothing applies. */
export function suggest(
  query: string,
  ctx: SuggestContext = {},
  limit = 8,
): { partial: string; items: Suggestion[] } | null {
  if (query.length && /\s$/.test(query)) return null;
  const partial = query.split(/\s+/).pop() ?? '';
  const negated = partial.startsWith('-');
  const body = negated ? partial.slice(1) : partial;
  const colon = body.indexOf(':');
  const prefix = negated ? '-' : '';

  if (colon < 0) {
    const needle = body.toLowerCase();
    const items = QUALIFIERS.filter((q) => q.startsWith(needle)).map((q) => ({
      insert: `${prefix}${q}:`,
      label: `${q}:`,
      description: QUALIFIER_HELP[q],
    }));
    return items.length ? { partial, items: items.slice(0, limit) } : null;
  }

  const key = body.slice(0, colon).toLowerCase();
  const typed = body.slice(colon + 1).toLowerCase();
  let values: string[] = [];
  if (key === 'repo') values = ctx.repos ?? [];
  else if (key === 'org' || key === 'user' || key === 'owner') values = ctx.owners ?? [];
  else if (key === 'label') values = ctx.labels ?? [];
  else values = VALUE_OPTIONS[key] ?? [];
  const items = values
    .filter((v) => v.toLowerCase().includes(typed))
    .sort((a, b) => Number(!a.toLowerCase().startsWith(typed)) - Number(!b.toLowerCase().startsWith(typed)))
    .slice(0, limit)
    .map((v) => ({ insert: quoteToken(`${prefix}${key}:${v}`), label: v }));
  return items.length ? { partial, items } : null;
}

/** Replaces the trailing partial token with a suggestion. */
export function applySuggestion(query: string, partial: string, insert: string): string {
  const base = query.slice(0, query.length - partial.length);
  const trailingSpace = insert.endsWith(':') ? '' : ' ';
  return `${base}${insert}${trailingSpace}`;
}
