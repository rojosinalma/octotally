import { type ReactNode, useEffect, useState } from 'react';
import { Ui } from 'tailor-react';
import { useApp } from '../hooks/useApp';
import { absoluteTime, relativeTime } from '../lib/format';
import { linkClick } from '../router';
import { MemberSwitcher } from './MemberSwitcher';

interface Props {
  /** Search bar slot (dashboard only). */
  search?: ReactNode;
  onShowShortcuts: () => void;
}

/** Navbar content; `Ui.AppShell nav` wraps it in the `.t-navbar` header. */
export function Header({ search, onShowShortcuts }: Props) {
  const { status, statusError, refresh, authRequired, logout } = useApp();
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
  const tipParts = [
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
    <>
      <MemberSwitcher />
      <Ui.Navbar.Brand href="/" onClick={linkClick('/')} aria-label="Octotally home">
        <img src="/favicon.svg" alt="" width={24} height={24} className="wordmark-mark" />
        <span>Octotally</span>
      </Ui.Navbar.Brand>
      <div className="header-search">{search}</div>
      <Ui.Navbar.End>
        <Ui.Button
          variant="ghost"
          size="sm"
          tone={failed ? 'danger' : undefined}
          className="status-pill"
          tip={tipParts.join(' · ') || 'No sync yet'}
          tipAt="bottom"
          onClick={() => void refresh()}
          aria-label={`Sync status: ${statusText}. Click to refresh.`}
        >
          {syncing ? (
            <Ui.Spinner size="sm" label={null} />
          ) : failed ? (
            <Ui.Icon name="bi-exclamation-triangle" />
          ) : null}
          {statusText}
        </Ui.Button>
        <Ui.Button
          variant="ghost"
          iconOnly
          aria-label="Refresh from GitHub"
          tip="Refresh from GitHub (r)"
          tipAt="bottom"
          disabled={syncing}
          onClick={() => void refresh()}
          className={syncing ? 'spin' : undefined}
        >
          <Ui.Icon name="bi-arrow-repeat" />
        </Ui.Button>
        <Ui.Menu
          align="end"
          variant="ghost"
          summaryClassName="avatar-button"
          trigger={
            login ? (
              <Ui.Avatar
                size="sm"
                src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
                alt="Account menu"
              />
            ) : (
              <Ui.Icon name="bi-person" label="Account menu" />
            )
          }
        >
          {login && (
            <>
              <Ui.Menu.Header>
                Signed in as <strong>{login}</strong>
              </Ui.Menu.Header>
              <Ui.Menu.Divider />
            </>
          )}
          <li>
            <a className="t-menu-item" role="menuitem" href="/settings" onClick={linkClick('/settings')}>
              <Ui.Icon name="bi-gear" />
              Settings
            </a>
          </li>
          <Ui.Menu.Item onSelect={onShowShortcuts}>
            <Ui.Icon name="bi-keyboard" />
            Keyboard shortcuts
            <Ui.Menu.Kbd>?</Ui.Menu.Kbd>
          </Ui.Menu.Item>
          {authRequired && (
            <>
              <Ui.Menu.Divider />
              <Ui.Menu.Item onSelect={() => void logout()}>
                <Ui.Icon name="bi-box-arrow-right" />
                Sign out
              </Ui.Menu.Item>
            </>
          )}
        </Ui.Menu>
      </Ui.Navbar.End>
    </>
  );
}
