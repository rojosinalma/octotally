import { OctoforgeManifest } from '@octotally/shared';
import manifestJson from '../../../../../octoforge.json';

/**
 * `octoforge.json` at the repository root, bundled by import (the image copies it next to
 * package.json) and validated at load time: a broken manifest fails the boot, not a request.
 */
export const MANIFEST: OctoforgeManifest = OctoforgeManifest.parse(manifestJson);
