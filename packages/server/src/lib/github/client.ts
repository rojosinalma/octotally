import { log } from '../../log';
import { USER_AGENT } from '../../version';

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate_limit' | 'upstream' | 'schema',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}
export class AuthError extends GitHubError {
  constructor(message = 'GitHub rejected the token') {
    super(message, 'auth', 401);
    this.name = 'AuthError';
  }
}
export class RateLimitError extends GitHubError {
  constructor(
    message: string,
    readonly resetAt: string | null,
  ) {
    super(message, 'rate_limit', 403);
    this.name = 'RateLimitError';
  }
}
export class UpstreamError extends GitHubError {
  constructor(message: string, status?: number) {
    super(message, 'upstream', status);
    this.name = 'UpstreamError';
  }
}

export interface RateLimit {
  cost: number;
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface GraphQLOptions {
  endpoint?: string;
  fetch?: typeof fetch;
  /** Retries on 502/503/504 and secondary rate limits. */
  maxRetries?: number;
  /** Hook for tests: replaces the real sleep. */
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

export interface GraphQLResult<T> {
  data: T;
  rateLimit: RateLimit | null;
}

type GraphQLEnvelope = {
  data?: Record<string, unknown> | null;
  errors?: { message: string; type?: string }[];
};

const RETRY_STATUSES = new Set([502, 503, 504]);

/**
 * Minimal GitHub GraphQL client: one method, typed errors, rate-limit bookkeeping.
 * Every query document must select `rateLimit { cost remaining limit resetAt }` so the cost is logged.
 */
export class GitHubClient {
  readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly logger = log('github');
  lastRateLimit: RateLimit | null = null;

  constructor(
    private readonly token: string,
    opts: GraphQLOptions = {},
  ) {
    this.endpoint = opts.endpoint ?? 'https://api.github.com/graphql';
    this.fetchImpl = opts.fetch ?? fetch;
    this.maxRetries = opts.maxRetries ?? 3;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  async query<T = Record<string, unknown>>(
    name: string,
    document: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResult<T>> {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const started = Date.now();
      let res: Response;
      try {
        res = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: {
            authorization: `bearer ${this.token}`,
            'content-type': 'application/json',
            accept: 'application/vnd.github+json',
            'user-agent': USER_AGENT,
          },
          body: JSON.stringify({ query: document, variables }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        if (attempt <= this.maxRetries) {
          this.logger.warn({ query: name, attempt, err: String(err) }, 'network error, retrying');
          await this.sleep(this.backoffMs(attempt));
          continue;
        }
        throw new UpstreamError(`GitHub unreachable: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (res.status === 401) throw new AuthError();
      if (res.status === 403 || res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const remaining = res.headers.get('x-ratelimit-remaining');
        const reset = res.headers.get('x-ratelimit-reset');
        const resetAt = reset ? new Date(Number(reset) * 1000).toISOString() : null;
        if (remaining === '0') throw new RateLimitError('GitHub rate limit exhausted', resetAt);
        if (attempt <= this.maxRetries) {
          const wait =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : this.backoffMs(attempt);
          this.logger.warn({ query: name, attempt, waitMs: wait }, 'secondary rate limit, retrying');
          await this.sleep(wait);
          continue;
        }
        throw new RateLimitError('GitHub secondary rate limit', resetAt);
      }
      if (RETRY_STATUSES.has(res.status) && attempt <= this.maxRetries) {
        this.logger.warn({ query: name, attempt, status: res.status }, 'upstream error, retrying');
        await this.sleep(this.backoffMs(attempt));
        continue;
      }
      if (!res.ok) throw new UpstreamError(`GitHub returned HTTP ${res.status}`, res.status);

      let body: GraphQLEnvelope;
      try {
        body = (await res.json()) as GraphQLEnvelope;
      } catch {
        throw new UpstreamError('GitHub returned a non-JSON body', res.status);
      }
      const rate = extractRateLimit(body.data);
      if (rate) this.lastRateLimit = rate;
      this.logger.info(
        {
          query: name,
          ms: Date.now() - started,
          cost: rate?.cost ?? null,
          remaining: rate?.remaining ?? null,
          resetAt: rate?.resetAt ?? null,
        },
        'graphql',
      );
      if (body.errors?.length) {
        const types = body.errors.map((e) => e.type ?? '');
        const msg = body.errors.map((e) => e.message).join('; ');
        if (types.includes('RATE_LIMITED')) throw new RateLimitError(msg, rate?.resetAt ?? null);
        if (types.includes('FORBIDDEN') || /bad credentials/i.test(msg)) throw new AuthError(msg);
        // Partial data with non-fatal errors (e.g. a deleted repo node) is still usable.
        if (!body.data) throw new UpstreamError(`GitHub GraphQL error: ${msg}`);
        this.logger.warn({ query: name, errors: body.errors.length, msg }, 'graphql partial errors');
      }
      if (!body.data) throw new UpstreamError('GitHub returned no data');
      return { data: body.data as T, rateLimit: rate };
    }
  }

  private backoffMs(attempt: number): number {
    return Math.min(30_000, 1000 * 2 ** (attempt - 1));
  }
}

function extractRateLimit(data: Record<string, unknown> | null | undefined): RateLimit | null {
  const r = data?.rateLimit as Partial<RateLimit> | undefined;
  if (!r || typeof r.remaining !== 'number') return null;
  return {
    cost: typeof r.cost === 'number' ? r.cost : 0,
    remaining: r.remaining,
    limit: typeof r.limit === 'number' ? r.limit : 5000,
    resetAt: typeof r.resetAt === 'string' ? r.resetAt : new Date().toISOString(),
  };
}
