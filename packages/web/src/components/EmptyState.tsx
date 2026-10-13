import type { SyncStatus } from '@octotally/shared';
import { AlertIcon, CheckCircleIcon, KeyIcon, SearchIcon } from '@primer/octicons-react';
import { Link } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import { relativeTime } from '../lib/format';

interface Props {
  kind: 'no-token' | 'nothing' | 'no-results' | 'error';
  status?: SyncStatus | null;
  message?: string;
  onClear?: () => void;
  onRetry?: () => void;
}

export function EmptyState({ kind, status, message, onClear, onRetry }: Props) {
  if (kind === 'no-token') {
    return (
      <Blankslate border spacious>
        <Blankslate.Visual>
          <KeyIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>Connect a GitHub token</Blankslate.Heading>
        <Blankslate.Description>
          Octotally reads your involvement through the GitHub API. Create a{' '}
          <Link
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            fine-grained personal access token
          </Link>{' '}
          with <strong>read-only</strong> access to Issues, Pull requests, Discussions and Metadata on the
          repositories you care about (or all repositories). Then set <code>GITHUB_TOKEN</code> in the
          environment and restart the server.
          {status?.lastError && (
            <>
              <br />
              <span className="fg-danger">Last error: {status.lastError}</span>
            </>
          )}
        </Blankslate.Description>
      </Blankslate>
    );
  }
  if (kind === 'error') {
    return (
      <Blankslate border>
        <Blankslate.Visual>
          <AlertIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>Could not load items</Blankslate.Heading>
        <Blankslate.Description>{message ?? 'Unknown error'}</Blankslate.Description>
        {onRetry && <Blankslate.PrimaryAction onClick={onRetry}>Try again</Blankslate.PrimaryAction>}
      </Blankslate>
    );
  }
  if (kind === 'no-results') {
    return (
      <Blankslate border>
        <Blankslate.Visual>
          <SearchIcon size="medium" />
        </Blankslate.Visual>
        <Blankslate.Heading>No items match</Blankslate.Heading>
        <Blankslate.Description>
          Try removing a filter or widening the activity window.
        </Blankslate.Description>
        {onClear && <Blankslate.PrimaryAction onClick={onClear}>Clear filters</Blankslate.PrimaryAction>}
      </Blankslate>
    );
  }
  return (
    <Blankslate border spacious>
      <Blankslate.Visual>
        <CheckCircleIcon size="medium" className="fg-success" />
      </Blankslate.Visual>
      <Blankslate.Heading>Nothing needs your attention</Blankslate.Heading>
      <Blankslate.Description>
        {status?.nextSyncAt ? `Next check ${relativeTime(status.nextSyncAt)}.` : 'Waiting for the next sync.'}
      </Blankslate.Description>
    </Blankslate>
  );
}
