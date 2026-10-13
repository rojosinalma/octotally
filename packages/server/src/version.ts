import rootPkg from '../../../package.json';

/** Version of the monorepo (root package.json, maintained by release-please). */
export const VERSION: string = (rootPkg as { version?: string }).version ?? '0.0.0';
export const USER_AGENT = `octotally/${VERSION}`;
