import { z } from 'zod';

// ---------------------------------------------------------------------------
// Octoforge member contract v1: the `octoforge.json` manifest and the /api/octoforge answers
// ---------------------------------------------------------------------------

export const OCTOFORGE_CONTRACT = 1;

const Access = z.enum(['read', 'write']);
const RelPath = z.string().startsWith('/');

export const OctoforgeManifest = z.object({
  contract: z.literal(OCTOFORGE_CONTRACT),
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  icon: RelPath,
  health: RelPath,
  github: z
    .object({
      auth: z.array(z.enum(['app', 'pat'])).min(1),
      app: z
        .object({
          permissions: z.record(z.string(), Access),
          events: z.array(z.string()),
          webhook_path: RelPath.optional(),
          setup_path: RelPath.optional(),
        })
        .optional(),
      pat: z
        .object({
          classic_scopes: z.array(z.string()).min(1),
          fine_grained: z.record(z.string(), Access),
          user_identity: z.boolean(),
        })
        .optional(),
    })
    .optional(),
  database: z
    .object({
      engines: z.array(z.enum(['sqlite', 'postgres'])).min(1),
      schema: z.boolean(),
    })
    .optional(),
  env: z.record(z.string(), z.string().regex(/^[A-Z][A-Z0-9_]*$/)),
});
export type OctoforgeManifest = z.infer<typeof OctoforgeManifest>;

/** Only http(s): the URLs end up as link targets and image sources in the UI. */
const WebUrl = z
  .string()
  .max(2048)
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'must be an absolute http(s) URL');

/** Body of `PUT /api/octoforge/siblings`: Octoforge and every member with an instance. */
export const OctoforgeSiblings = z.object({
  forge: z.object({ title: z.string().min(1).max(100), url: WebUrl, icon: WebUrl.optional() }),
  members: z
    .array(
      z.object({
        name: z
          .string()
          .regex(/^[a-z][a-z0-9-]*$/)
          .max(100),
        title: z.string().min(1).max(100),
        url: WebUrl,
        icon: WebUrl.optional(),
      }),
    )
    .max(100),
  updated_at: z.iso.datetime({ offset: true }),
});
export type OctoforgeSiblings = z.infer<typeof OctoforgeSiblings>;

/** `GET /api/siblings` for the UI: the stored list plus which entry is this app. */
export interface SiblingsView extends OctoforgeSiblings {
  /** Manifest name of this app; the member with this name is the current one. */
  self: string;
  /** When this instance received the list. */
  received_at: string;
}

export type CredentialSource = 'env' | 'octoforge' | 'none';

/** `GET /api/octoforge/status` minus the envelope. Never carries a secret. */
export interface OctoforgeStatus {
  contract: typeof OCTOFORGE_CONTRACT;
  version: string;
  github: { mode: 'pat' | null; source: CredentialSource; login?: string };
  database: { engine: 'sqlite' | 'postgres'; schema?: string; source: CredentialSource };
}
