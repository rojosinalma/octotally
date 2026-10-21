import type { SyncStatus } from '@octotally/shared';
import { Ui } from 'tailor-react';
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
      <Ui.EmptyState icon="bi-key" title="Connect a GitHub token">
        <p>
          Octotally reads your involvement through the GitHub API. Create a{' '}
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            fine-grained personal access token
          </a>{' '}
          with <strong>read-only</strong> access to Issues, Pull requests, Discussions and Metadata on the
          repositories you care about (or all repositories). Then set <code>GITHUB_TOKEN</code> in the
          environment and restart the server.
        </p>
        {status?.lastError && (
          <p className="t-tone-text" data-tone="danger">
            Last error: {status.lastError}
          </p>
        )}
      </Ui.EmptyState>
    );
  }
  if (kind === 'error') {
    return (
      <Ui.EmptyState
        icon="bi-exclamation-triangle"
        title="Could not load items"
        actions={
          onRetry && (
            <Ui.Button variant="primary" onClick={onRetry}>
              Try again
            </Ui.Button>
          )
        }
      >
        <p>{message ?? 'Unknown error'}</p>
      </Ui.EmptyState>
    );
  }
  if (kind === 'no-results') {
    return (
      <Ui.EmptyState
        icon="bi-search"
        title="No items match"
        actions={
          onClear && (
            <Ui.Button variant="primary" onClick={onClear}>
              Clear filters
            </Ui.Button>
          )
        }
      >
        <p>Try removing a filter or widening the activity window.</p>
      </Ui.EmptyState>
    );
  }
  return (
    <Ui.EmptyState icon="bi-check-circle" title="Nothing needs your attention">
      <p>
        {status?.nextSyncAt ? `Next check ${relativeTime(status.nextSyncAt)}.` : 'Waiting for the next sync.'}
      </p>
    </Ui.EmptyState>
  );
}
