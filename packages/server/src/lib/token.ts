/**
 * Where the GitHub token comes from. The only seam auth changes touch:
 * `EnvToken` now, an `OAuthToken` (encrypted at rest) later.
 */
export interface TokenSource {
  /** `null` when no token is available (the app still boots and shows onboarding). */
  getToken(): Promise<string | null>;
  /** Human-readable origin for /api/status and logs; never includes the token itself. */
  describe(): string;
}

export class EnvToken implements TokenSource {
  constructor(private readonly value: string | undefined) {}

  async getToken(): Promise<string | null> {
    return this.value && this.value.length > 0 ? this.value : null;
  }

  describe(): string {
    return this.value ? 'GITHUB_TOKEN (env)' : 'GITHUB_TOKEN not set';
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
}
