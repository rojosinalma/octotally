import { z } from 'zod';
import { log } from '../../log';
import { USER_AGENT } from '../../version';
import { AuthError, UpstreamError } from './client';

export interface RestOptions {
  /** REST base URL; GitHub Enterprise and tests override it. */
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const TokenUser = z.object({ login: z.string().min(1), type: z.string() });
export type TokenUser = z.infer<typeof TokenUser>;

const ErrorBody = z.object({ message: z.string() });

/**
 * `GET /user` with the given token: who the token acts as. Throws `AuthError` (401/403, with
 * GitHub's reason) or `UpstreamError` (network, 5xx, unexpected body). The token is never logged.
 */
export async function fetchTokenUser(token: string, opts: RestOptions = {}): Promise<TokenUser> {
  const logger = log('github');
  const url = `${opts.baseUrl ?? 'https://api.github.com'}/user`;
  const started = Date.now();
  let res: Response;
  try {
    res = await (opts.fetch ?? fetch)(url, {
      headers: {
        authorization: `bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    });
  } catch (err) {
    throw new UpstreamError(`GitHub unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  logger.info(
    {
      query: 'rest:user',
      status: res.status,
      ms: Date.now() - started,
      cost: 1,
      remaining: numberHeader(res, 'x-ratelimit-remaining'),
    },
    'rest',
  );
  const body: unknown = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403) {
    const reason = ErrorBody.safeParse(body);
    throw new AuthError(reason.success ? reason.data.message : `HTTP ${res.status}`);
  }
  if (!res.ok) throw new UpstreamError(`GitHub returned HTTP ${res.status}`, res.status);
  const user = TokenUser.safeParse(body);
  if (!user.success) throw new UpstreamError('GitHub returned an unexpected /user body', res.status);
  return user.data;
}

function numberHeader(res: Response, name: string): number | null {
  const v = res.headers.get(name);
  return v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
}
