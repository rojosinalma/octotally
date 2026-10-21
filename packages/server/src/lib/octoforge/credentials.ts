import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { log } from '../../log';

/**
 * The GitHub token Octoforge delivered, in the settings table under a key the shared `Settings`
 * schema does not know, so `GET/PUT /api/settings` never reads or writes it.
 *
 * Encrypted at rest: AES-256-GCM (WebCrypto), 96-bit random IV per write, the row key as
 * additional data; the key is derived with HKDF-SHA-256 from the session secret. The member
 * database may move into a shared Postgres where a read-only role can SELECT every table.
 */
export const DELIVERED_TOKEN_KEY = 'octoforge.github_token';

const HKDF_SALT = 'octotally';
const HKDF_INFO = 'octoforge github token v1';

/** Stored JSON. `login` is not secret; it lets /status answer without a GitHub call. */
interface Envelope {
  v: 1;
  iv: string;
  data: string;
  login: string;
}

const enc = new TextEncoder();
const b64 = (bytes: ArrayBuffer | Uint8Array) => Buffer.from(bytes as Uint8Array).toString('base64url');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

export class CredentialStore {
  private key: Promise<CryptoKey> | null = null;
  private warned = false;
  private readonly logger = log('octoforge');

  constructor(
    private readonly db: Db,
    private readonly secret: string,
  ) {}

  private cryptoKey(): Promise<CryptoKey> {
    this.key ??= crypto.subtle
      .importKey('raw', enc.encode(this.secret), 'HKDF', false, ['deriveKey'])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: enc.encode(HKDF_SALT), info: enc.encode(HKDF_INFO) },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        ),
      );
    return this.key;
  }

  async save(token: string, login: string): Promise<void> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: enc.encode(DELIVERED_TOKEN_KEY) },
      await this.cryptoKey(),
      enc.encode(token),
    );
    const envelope: Envelope = { v: 1, iv: b64(iv), data: b64(data), login };
    const value = JSON.stringify(envelope);
    const updatedAt = new Date().toISOString();
    const settings = this.db.t.settings;
    await this.db.orm
      .insert(settings)
      .values({ key: DELIVERED_TOKEN_KEY, value, updatedAt })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });
    this.warned = false;
  }

  /** The delivered token, or `null` when there is none or it cannot be decrypted (logged once, without the value). */
  async load(): Promise<{ token: string; login: string } | null> {
    const envelope = await this.envelope();
    if (!envelope) return null;
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(envelope.iv), additionalData: enc.encode(DELIVERED_TOKEN_KEY) },
        await this.cryptoKey(),
        unb64(envelope.data),
      );
      return { token: new TextDecoder().decode(plain), login: envelope.login };
    } catch {
      this.warnOnce(
        'delivered GitHub token cannot be decrypted (session secret changed?); using GITHUB_TOKEN',
      );
      return null;
    }
  }

  async token(): Promise<string | null> {
    return (await this.load())?.token ?? null;
  }

  /** Drops the stored token; `true` when there was one. */
  async clear(): Promise<boolean> {
    const settings = this.db.t.settings;
    const rows = await this.db.orm
      .delete(settings)
      .where(eq(settings.key, DELIVERED_TOKEN_KEY))
      .returning({ key: settings.key });
    this.warned = false;
    return rows.length > 0;
  }

  private async envelope(): Promise<Envelope | null> {
    const settings = this.db.t.settings;
    const [row] = await this.db.orm
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, DELIVERED_TOKEN_KEY))
      .limit(1);
    if (!row) return null;
    try {
      const v = JSON.parse(row.value) as Partial<Envelope>;
      if (v.v === 1 && typeof v.iv === 'string' && typeof v.data === 'string') {
        return { v: 1, iv: v.iv, data: v.data, login: typeof v.login === 'string' ? v.login : '' };
      }
    } catch {
      // fall through
    }
    this.warnOnce('stored delivered GitHub token is malformed; using GITHUB_TOKEN');
    return null;
  }

  /** The token is read on every sync: say it once per bad value, not once per poll. */
  private warnOnce(message: string) {
    if (this.warned) return;
    this.warned = true;
    this.logger.warn({ key: DELIVERED_TOKEN_KEY }, message);
  }
}
