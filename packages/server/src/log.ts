import pino, { type DestinationStream, type Logger } from 'pino';

export type Subsystem =
  | 'http'
  | 'github'
  | 'poll'
  | 'digest'
  | 'notify'
  | 'db'
  | 'boot'
  | 'auth'
  | 'octoforge';

let root: Logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/** Replace the root logger (boot sets the level from env; tests silence it or capture the lines). */
export function configureLog(level: string, destination?: DestinationStream): Logger {
  root = destination ? pino({ level }, destination) : pino({ level });
  return root;
}

export function log(subsystem: Subsystem): Logger {
  return root.child({ subsystem });
}

/** Serialises an unknown error for a log line without leaking anything but message + stack. */
export function errInfo(err: unknown): { message: string; stack?: string; name?: string } {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { message: String(err) };
}
