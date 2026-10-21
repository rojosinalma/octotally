/**
 * Where the GitHub token comes from. The only seam auth changes touch:
 * `EnvToken` standalone, `LayeredToken` (a token delivered by Octoforge over the env one), OAuth later.
 */
export interface TokenSource {
  /** `null` when no token is available (the app still boots and shows onboarding). */
  getToken(): Promise<string | null>;
  /** Human-readable origin for /api/status and logs; never includes the token itself. */
  describe(): string;
  /** Machine-readable origin for /api/octoforge/status. */
  source(): Promise<TokenOrigin>;
}

export type TokenOrigin = 'env' | 'octoforge' | 'none';

const ENV_LABEL = 'GITHUB_TOKEN (env)';
const NONE_LABEL = 'GITHUB_TOKEN not set';

export class EnvToken implements TokenSource {
  constructor(private readonly value: string | undefined) {}

  async getToken(): Promise<string | null> {
    return this.value && this.value.length > 0 ? this.value : null;
  }

  describe(): string {
    return this.value ? ENV_LABEL : NONE_LABEL;
  }

  async source(): Promise<TokenOrigin> {
    return this.value ? 'env' : 'none';
  }
}

/**
 * A delivered token (read at use time, so a PUT/DELETE applies to the next sync) wins over the
 * env token. `describe()` reports the origin of the last lookup.
 */
export class LayeredToken implements TokenSource {
  private readonly env: EnvToken;
  private last: TokenOrigin;

  constructor(
    private readonly delivered: () => Promise<string | null>,
    envValue: string | undefined,
  ) {
    this.env = new EnvToken(envValue);
    this.last = envValue ? 'env' : 'none';
  }

  async getToken(): Promise<string | null> {
    const token = await this.delivered();
    if (token) {
      this.last = 'octoforge';
      return token;
    }
    this.last = await this.env.source();
    return this.env.getToken();
  }

  describe(): string {
    if (this.last === 'octoforge') return 'token delivered by Octoforge';
    return this.last === 'env' ? ENV_LABEL : NONE_LABEL;
  }

  async source(): Promise<TokenOrigin> {
    await this.getToken();
    return this.last;
  }
}

/** Fixed token for tests. */
export class StaticToken implements TokenSource {
  constructor(private readonly value: string | null) {}
  async getToken(): Promise<string | null> {
    return this.value;
  }
  describe(): string {
    return this.value ? 'static token' : 'no token';
  }
  async source(): Promise<TokenOrigin> {
    return this.value ? 'env' : 'none';
  }
}
