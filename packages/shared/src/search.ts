import type { Hidden, Item, ItemState, ItemType, Role, Settings } from './types';

/**
 * GitHub-compatible search subset. Terms are ANDed; `-` negates a qualifier.
 *
 *   is:open|closed|merged|draft|answered|unanswered   state:open|closed
 *   is:issue|pr|discussion                             type:issue|pr|discussion
 *   repo:owner/name  org:owner  user:owner
 *   author:login|@me  assignee:login|@me  mentions:@me  commenter:@me  reviewer:@me
 *   role:author|assigned|mentioned|commenter|reviewer
 *   label:name  no:label|assignee|linked
 *   linked:pr
 *   updated:>14d  updated:>=2026-01-01  created:<2w  activity:>1mo  (d w mo y; .. ranges)
 *   (`updated` and `activity` both compare the item's last known activity)
 *   comments:>5
 *   hidden:none|muted|done|hidden|any     (local; `hidden` = muted or done; defaults to none when absent)
 *   sort:updated-desc|updated-asc|created-desc|created-asc|comments-desc
 *   "quoted text" or bare words           → title match (case-insensitive)
 *
 * `{setting}` placeholders in a view query are substituted from Settings before parsing.
 */

export type DateOp = '>' | '>=' | '<' | '<=' | '=' | '..';
export interface DateExpr {
  op: DateOp;
  /** ISO datetime of the bound (relative units resolved against `now`). */
  from: string;
  /** Only for `..` ranges. */
  to?: string;
  /** Original token, for round-tripping. */
  raw: string;
}

export type NumOp = '>' | '>=' | '<' | '<=' | '=';
export interface NumExpr {
  op: NumOp;
  value: number;
  raw: string;
}

export type SortKey = 'updated-desc' | 'updated-asc' | 'created-desc' | 'created-asc' | 'comments-desc';

export interface ParsedSearch {
  text: string[];
  types: Set<ItemType>;
  notTypes: Set<ItemType>;
  states: Set<ItemState>;
  notStates: Set<ItemState>;
  draft: boolean | null;
  answered: boolean | null;
  repos: Set<string>;
  notRepos: Set<string>;
  owners: Set<string>;
  notOwners: Set<string>;
  authors: Set<string>;
  notAuthors: Set<string>;
  assignees: Set<string>;
  notAssignees: Set<string>;
  roles: Set<Role>;
  notRoles: Set<Role>;
  labels: Set<string>;
  notLabels: Set<string>;
  noLabel: boolean;
  noAssignee: boolean;
  linkedPr: boolean | null;
  updated: DateExpr[];
  created: DateExpr[];
  activity: DateExpr[];
  comments: NumExpr[];
  hidden: Hidden | 'hidden' | 'any';
  sort: SortKey;
  /** Tokens the grammar did not understand, kept so the UI can flag them. */
  unknown: string[];
}

export interface ParseOptions {
  /** Reference instant for relative dates; defaults to `new Date()`. */
  now?: Date;
  /** Login substituted for `@me`; `@me` is kept literally when absent. */
  me?: string;
}

const UNIT_MS: Record<string, number> = {
  d: 86_400_000,
  w: 7 * 86_400_000,
  mo: 30 * 86_400_000,
  y: 365 * 86_400_000,
};

const TYPE_ALIASES: Record<string, ItemType> = {
  issue: 'issue',
  issues: 'issue',
  pr: 'pr',
  prs: 'pr',
  pull: 'pr',
  pullrequest: 'pr',
  discussion: 'discussion',
  discussions: 'discussion',
};

const ROLE_ALIASES: Record<string, Role> = {
  author: 'author',
  assigned: 'assigned',
  assignee: 'assigned',
  mentioned: 'mentioned',
  mentions: 'mentioned',
  commenter: 'commenter',
  commented: 'commenter',
  reviewer: 'reviewer',
  'review-requested': 'reviewer',
};

export function emptySearch(): ParsedSearch {
  return {
    text: [],
    types: new Set(),
    notTypes: new Set(),
    states: new Set(),
    notStates: new Set(),
    draft: null,
    answered: null,
    repos: new Set(),
    notRepos: new Set(),
    owners: new Set(),
    notOwners: new Set(),
    authors: new Set(),
    notAuthors: new Set(),
    assignees: new Set(),
    notAssignees: new Set(),
    roles: new Set(),
    notRoles: new Set(),
    labels: new Set(),
    notLabels: new Set(),
    noLabel: false,
    noAssignee: false,
    linkedPr: null,
    updated: [],
    created: [],
    activity: [],
    comments: [],
    hidden: 'none',
    sort: 'updated-desc',
    unknown: [],
  };
}

/** Splits on whitespace, honouring double quotes (`label:"help wanted"`, `"exact title"`). */
export function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuote = false;
  for (const ch of query.trim()) {
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && /\s/.test(ch)) {
      if (cur) tokens.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

/** Replaces `{key}` with the setting's value (numbers/strings only). */
export function substituteSettings(query: string, settings: Settings): string {
  return query.replace(/\{([a-zA-Z]+)\}/g, (whole, key: string) => {
    const v = (settings as Record<string, unknown>)[key];
    return typeof v === 'number' || typeof v === 'string' ? String(v) : whole;
  });
}

function parseDateBound(raw: string, now: Date): string | null {
  const rel = /^(\d+)(d|w|mo|y)$/.exec(raw);
  if (rel) {
    const n = Number(rel[1]);
    const unit = UNIT_MS[rel[2] as string];
    if (unit === undefined) return null;
    return new Date(now.getTime() - n * unit).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(raw)) {
    const d = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function parseDateExpr(raw: string, now: Date): DateExpr | null {
  const range = raw.split('..');
  if (range.length === 2) {
    const from = parseDateBound(range[0] as string, now);
    const to = parseDateBound(range[1] as string, now);
    if (!from || !to) return null;
    return { op: '..', from, to, raw };
  }
  const m = /^(>=|<=|>|<|=)?(.+)$/.exec(raw);
  if (!m) return null;
  const op = (m[1] ?? '=') as DateOp;
  const bound = parseDateBound(m[2] as string, now);
  if (!bound) return null;
  // Relative bounds invert intuitively: "updated:>14d" means newer than 14 days ago.
  return { op, from: bound, raw };
}

export function parseNumExpr(raw: string): NumExpr | null {
  const m = /^(>=|<=|>|<|=)?(\d+)$/.exec(raw);
  if (!m) return null;
  return { op: (m[1] ?? '=') as NumOp, value: Number(m[2]), raw };
}

export function parseSearch(query: string, opts: ParseOptions = {}): ParsedSearch {
  const now = opts.now ?? new Date();
  const me = (v: string) => (v === '@me' && opts.me ? opts.me.toLowerCase() : v.toLowerCase());
  const p = emptySearch();
  let hiddenSet = false;

  for (const token of tokenize(query)) {
    const negated = token.startsWith('-') && token.includes(':');
    const body = negated ? token.slice(1) : token;
    const colon = body.indexOf(':');
    if (colon <= 0) {
      p.text.push(body);
      continue;
    }
    const key = body.slice(0, colon).toLowerCase();
    const value = body.slice(colon + 1);
    const lower = value.toLowerCase();
    const add = <T>(yes: Set<T>, no: Set<T>, v: T) => (negated ? no : yes).add(v);

    switch (key) {
      case 'is':
      case 'type':
      case 'state': {
        const t = TYPE_ALIASES[lower];
        if (t) {
          add(p.types, p.notTypes, t);
        } else if (lower === 'open' || lower === 'closed' || lower === 'merged') {
          add(p.states, p.notStates, lower);
        } else if (lower === 'draft') {
          p.draft = !negated;
        } else if (lower === 'answered') {
          p.answered = !negated;
        } else if (lower === 'unanswered') {
          p.answered = negated;
        } else {
          p.unknown.push(token);
        }
        break;
      }
      case 'repo':
        add(p.repos, p.notRepos, lower);
        break;
      case 'org':
      case 'user':
      case 'owner':
        add(p.owners, p.notOwners, lower);
        break;
      case 'author':
        add(p.authors, p.notAuthors, me(value));
        break;
      case 'assignee':
        add(p.assignees, p.notAssignees, me(value));
        break;
      case 'mentions':
      case 'commenter':
      case 'reviewer':
      case 'involves':
        // These qualifiers always refer to the token's own account; map them to role filters.
        if (key === 'involves') break;
        add(p.roles, p.notRoles, ROLE_ALIASES[key] as Role);
        break;
      case 'role': {
        const r = ROLE_ALIASES[lower];
        if (r) add(p.roles, p.notRoles, r);
        else p.unknown.push(token);
        break;
      }
      case 'label':
        for (const l of value.split(',')) if (l) add(p.labels, p.notLabels, l.toLowerCase());
        break;
      case 'no':
        if (lower === 'label') p.noLabel = !negated;
        else if (lower === 'assignee') p.noAssignee = !negated;
        else if (lower === 'linked') p.linkedPr = negated;
        else p.unknown.push(token);
        break;
      case 'linked':
        if (lower === 'pr') p.linkedPr = !negated;
        else p.unknown.push(token);
        break;
      case 'updated':
      case 'created':
      case 'activity': {
        const d = parseDateExpr(value, now);
        if (d) p[key].push(d);
        else p.unknown.push(token);
        break;
      }
      case 'comments': {
        const n = parseNumExpr(value);
        if (n) p.comments.push(n);
        else p.unknown.push(token);
        break;
      }
      case 'hidden':
        if (
          lower === 'none' ||
          lower === 'muted' ||
          lower === 'done' ||
          lower === 'hidden' ||
          lower === 'any'
        ) {
          p.hidden = lower;
          hiddenSet = true;
        } else p.unknown.push(token);
        break;
      case 'sort':
        if (
          lower === 'updated-desc' ||
          lower === 'updated-asc' ||
          lower === 'created-desc' ||
          lower === 'created-asc' ||
          lower === 'comments-desc'
        )
          p.sort = lower;
        else p.unknown.push(token);
        break;
      default:
        p.unknown.push(token);
    }
  }
  if (!hiddenSet) p.hidden = 'none';
  return p;
}

function cmpDate(value: string, e: DateExpr): boolean {
  const v = Date.parse(value);
  const from = Date.parse(e.from);
  switch (e.op) {
    case '>':
      return v > from;
    case '>=':
      return v >= from;
    case '<':
      return v < from;
    case '<=':
      return v <= from;
    case '=':
      return Math.abs(v - from) < (UNIT_MS.d as number);
    case '..':
      return v >= from && v <= Date.parse(e.to as string);
  }
}

function cmpNum(value: number, e: NumExpr): boolean {
  switch (e.op) {
    case '>':
      return value > e.value;
    case '>=':
      return value >= e.value;
    case '<':
      return value < e.value;
    case '<=':
      return value <= e.value;
    case '=':
      return value === e.value;
  }
}

/** Pure predicate shared by server filtering and client-side previews. */
export function matchesItem(p: ParsedSearch, item: Item): boolean {
  if (p.hidden === 'hidden') {
    if (item.hidden === 'none') return false;
  } else if (p.hidden !== 'any' && item.hidden !== p.hidden) return false;
  if (p.types.size && !p.types.has(item.type)) return false;
  if (p.notTypes.has(item.type)) return false;
  if (p.states.size && !p.states.has(item.state)) return false;
  if (p.notStates.has(item.state)) return false;
  if (p.draft !== null && item.isDraft !== p.draft) return false;
  if (p.answered !== null && item.isAnswered !== p.answered) return false;
  const repo = item.repo.toLowerCase();
  const owner = item.owner.toLowerCase();
  if (p.repos.size && !p.repos.has(repo)) return false;
  if (p.notRepos.has(repo)) return false;
  if (p.owners.size && !p.owners.has(owner)) return false;
  if (p.notOwners.has(owner)) return false;
  const author = item.author.toLowerCase();
  if (p.authors.size && !p.authors.has(author)) return false;
  if (p.notAuthors.has(author)) return false;
  const assignees = item.assignees.map((a) => a.toLowerCase());
  if (p.assignees.size && !assignees.some((a) => p.assignees.has(a))) return false;
  if (assignees.some((a) => p.notAssignees.has(a))) return false;
  if (p.roles.size && !item.roles.some((r) => p.roles.has(r))) return false;
  if (item.roles.some((r) => p.notRoles.has(r))) return false;
  const labels = item.labels.map((l) => l.toLowerCase());
  for (const l of p.labels) if (!labels.includes(l)) return false;
  for (const l of p.notLabels) if (labels.includes(l)) return false;
  if (p.noLabel && labels.length) return false;
  if (p.noAssignee && assignees.length) return false;
  if (p.linkedPr !== null && item.linkedPrs.length > 0 !== p.linkedPr) return false;
  // `updated:` follows what the UI shows as "updated" (last known activity), like `activity:`.
  for (const e of p.updated) if (!cmpDate(item.lastActivityAt, e)) return false;
  for (const e of p.created) if (!cmpDate(item.createdAt, e)) return false;
  for (const e of p.activity) if (!cmpDate(item.lastActivityAt, e)) return false;
  for (const e of p.comments) if (!cmpNum(item.commentCount, e)) return false;
  if (p.text.length) {
    const hay = `${item.title} ${item.repo} #${item.number}`.toLowerCase();
    for (const t of p.text) if (!hay.includes(t.toLowerCase())) return false;
  }
  return true;
}

export function sortItems(items: Item[], sort: SortKey): Item[] {
  const by = (f: (i: Item) => number, dir: 1 | -1) => (a: Item, b: Item) => (f(a) - f(b)) * dir;
  const upd = (i: Item) => Date.parse(i.lastActivityAt);
  const cre = (i: Item) => Date.parse(i.createdAt);
  switch (sort) {
    case 'updated-desc':
      return [...items].sort(by(upd, -1));
    case 'updated-asc':
      return [...items].sort(by(upd, 1));
    case 'created-desc':
      return [...items].sort(by(cre, -1));
    case 'created-asc':
      return [...items].sort(by(cre, 1));
    case 'comments-desc':
      return [...items].sort(by((i) => i.commentCount, -1));
  }
}

/** Filter + sort in one call; what the server does for `GET /api/items?q=`. */
export function applySearch(
  items: Item[],
  query: string,
  opts: ParseOptions & { settings?: Settings } = {},
): Item[] {
  const q = opts.settings ? substituteSettings(query, opts.settings) : query;
  const p = parseSearch(q, opts);
  return sortItems(
    items.filter((i) => matchesItem(p, i)),
    p.sort,
  );
}

/** Qualifier names, for autocomplete. */
export const QUALIFIERS = [
  'is',
  'type',
  'state',
  'repo',
  'org',
  'author',
  'assignee',
  'mentions',
  'commenter',
  'reviewer',
  'role',
  'label',
  'no',
  'linked',
  'updated',
  'created',
  'activity',
  'comments',
  'hidden',
  'sort',
] as const;
