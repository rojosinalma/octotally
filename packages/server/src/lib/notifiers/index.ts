import type { Settings } from '@octotally/shared';
import type { DigestMessage } from '../digest';
import { discord } from './discord';

/**
 * Notifier registry. Adding one = a file in this directory + one entry below.
 * `configured` decides from settings alone (no env), so the UI can show what is wired up.
 */
export interface Notifier {
  name: string;
  /** Human label for the settings UI. */
  label: string;
  configured(settings: Settings): boolean;
  send(message: DigestMessage, settings: Settings): Promise<void>;
}

export const notifiers: Record<string, Notifier> = {
  [discord.name]: discord,
};

export type { DigestMessage };
