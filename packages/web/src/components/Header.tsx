import type { Theme } from '@octotally/shared';
import {
  AlertIcon,
  CommandPaletteIcon,
  GearIcon,
  PaintbrushIcon,
  PersonIcon,
  SignOutIcon,
  SyncIcon,
} from '@primer/octicons-react';
import {
  ActionList,
  ActionMenu,
  Avatar,
  Button,
  IconButton,
  Header as PrimerHeader,
  Spinner,
} from '@primer/react';
import { Tooltip } from '@primer/react/next';
import { type ReactNode, useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { absoluteTime, relativeTime } from '../lib/format';
import { linkClick } from '../router';
import { THEME_LABELS, THEMES } from '../theme';
import { MemberSwitcher } from './MemberSwitcher';

interface Props {
  /** Search bar slot (dashboard only). */
  search?: ReactNode;
  onShowShortcuts: () => void;
}

export function Header({ search, onShowShortcuts }: Props) {
  const { status, statusError, refresh, settings, updateSettings, authRequired, logout } = useApp();
  // Re-render the relative time once a minute.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const syncing = status?.syncing ?? false;
  const failed = Boolean(status?.lastError) || Boolean(statusError);
  const statusText = syncing
    ? 'Syncing…'
    : status?.lastSyncAt
      ? `Synced ${relativeTime(status.lastSyncAt)}`
      : statusError
        ? 'Status unavailable'
        : 'Never synced';
  const tooltipParts = [
    status?.lastSyncAt ? `Last sync ${absoluteTime(status.lastSyncAt)}` : null,
    status?.nextSyncAt ? `Next ${relativeTime(status.nextSyncAt)}` : null,
    status?.githubRateRemaining !== null && status?.githubRateRemaining !== undefined
      ? `${status.githubRateRemaining} GitHub requests left`
      : null,
    status?.lastError ? `Error: ${status.lastError}` : null,
    statusError ? statusError.message : null,
  ].filter((p): p is string => Boolean(p));

  const login = status?.githubLogin ?? null;

  return (
    <PrimerHeader className="app-header" aria-label="Octotally">
      <MemberSwitcher />
      <PrimerHeader.Item>
        <PrimerHeader.Link href="/" onClick={linkClick('/')} className="wordmark" aria-label="Octotally home">
          <svg aria-hidden="true" viewBox="0 0 32 32" width="24" height="24" className="wordmark-mark">
            <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--fgColor-open)" />
            <g stroke="var(--fgColor-onEmphasis)" strokeWidth="2.6" strokeLinecap="round" fill="none">
              <path d="M9 8v16" />
              <path d="M16 8v16" />
              <path d="M23 8v16" />
              <path d="M6 22L26 10" />
            </g>
          </svg>
          <span>Octotally</span>
        </PrimerHeader.Link>
      </PrimerHeader.Item>
      <PrimerHeader.Item full className="header-search">
        {search}
      </PrimerHeader.Item>
      <PrimerHeader.Item>
        <Tooltip text={tooltipParts.join(' · ') || 'No sync yet'} direction="s">
          <Button
            variant="invisible"
            size="small"
            className={`status-pill${failed ? ' status-pill-failed' : ''}`}
            leadingVisual={
              syncing ? () => <Spinner size="small" srText={null} /> : failed ? AlertIcon : undefined
            }
            onClick={() => void refresh()}
            aria-label={`Sync status: ${statusText}. Click to refresh.`}
          >
            {statusText}
          </Button>
        </Tooltip>
      </PrimerHeader.Item>
      <PrimerHeader.Item>
        <IconButton
          icon={SyncIcon}
          aria-label="Refresh from GitHub"
          variant="invisible"
          keybindingHint="r"
          disabled={syncing}
          onClick={() => void refresh()}
          className={syncing ? 'spin' : undefined}
        />
      </PrimerHeader.Item>
      <PrimerHeader.Item>
        <ActionMenu>
          <ActionMenu.Anchor>
            <button type="button" className="avatar-button" aria-label="Account menu">
              {login ? (
                <Avatar
                  src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
                  alt=""
                  size={28}
                />
              ) : (
                <PersonIcon size={20} />
              )}
            </button>
          </ActionMenu.Anchor>
          <ActionMenu.Overlay width="medium" align="end">
            <ActionList>
              {login && (
                <>
                  <ActionList.Item disabled>
                    Signed in as <strong>{login}</strong>
                  </ActionList.Item>
                  <ActionList.Divider />
                </>
              )}
              <ActionList.Group selectionVariant="single">
                <ActionList.GroupHeading>
                  <PaintbrushIcon /> Theme
                </ActionList.GroupHeading>
                {THEMES.map((t: Theme) => (
                  <ActionList.Item
                    key={t}
                    selected={settings.theme === t}
                    onSelect={() => void updateSettings({ theme: t }, { silent: true })}
                  >
                    {THEME_LABELS[t]}
                  </ActionList.Item>
                ))}
              </ActionList.Group>
              <ActionList.Divider />
              <ActionList.LinkItem href="/settings" onClick={linkClick('/settings')}>
                <ActionList.LeadingVisual>
                  <GearIcon />
                </ActionList.LeadingVisual>
                Settings
              </ActionList.LinkItem>
              <ActionList.Item onSelect={onShowShortcuts}>
                <ActionList.LeadingVisual>
                  <CommandPaletteIcon />
                </ActionList.LeadingVisual>
                Keyboard shortcuts
                <ActionList.TrailingVisual>?</ActionList.TrailingVisual>
              </ActionList.Item>
              {authRequired && (
                <>
                  <ActionList.Divider />
                  <ActionList.Item onSelect={() => void logout()}>
                    <ActionList.LeadingVisual>
                      <SignOutIcon />
                    </ActionList.LeadingVisual>
                    Sign out
                  </ActionList.Item>
                </>
              )}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      </PrimerHeader.Item>
    </PrimerHeader>
  );
}
