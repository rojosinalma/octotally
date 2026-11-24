import type { View } from '@octotally/shared';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef } from 'react';
import { HotkeysHelp, useHotkey } from 'tailor/command';
import {
  Avatar,
  Button,
  type FooterFact,
  Icon,
  type IconName,
  Menu,
  type MenuItem,
  type NavGroup,
  RelativeTime,
  Tooltip,
} from 'tailor/core';
import { SideNavShell } from 'tailor/shell-sidenav';
import { useAuth } from '../auth';
import { switcherMembers } from '../lib/siblings';
import {
  keys,
  useRefresh,
  useSettings,
  useSiblings,
  useStatus,
  useVersion,
  useViewCounts,
  useViews,
} from '../queries';
import { BRAND, REPO_URL } from './brand';

const VIEW_ICONS: Record<string, IconName> = {
  all: 'bi:inbox',
  active: 'bi:activity',
  'needs-pr': 'bi:exclamation-circle',
  hidden: 'bi:eye-slash',
};
const viewIcon = (view: View): IconName => VIEW_ICONS[view.id] ?? 'bi:bookmark';

/** Octoforge and its members, from the list Octoforge pushes. Nothing when there is no list. */
function MemberSwitcher() {
  const siblings = useSiblings().data;
  if (!siblings) return null;
  const members = switcherMembers(siblings);
  const items: MenuItem[] = [
    { id: 'forge', label: siblings.forge.title, icon: <Icon name="bi:grid" />, to: siblings.forge.url },
  ];
  if (members.length > 0)
    items.push({
      type: 'radio-group',
      label: 'Members',
      value: members.find((m) => m.current)?.key ?? '',
      onValueChange: (key) => {
        const target = members.find((m) => m.key === key);
        if (target && !target.current) window.location.assign(target.url);
      },
      options: members.map((m) => ({ value: m.key, label: m.title })),
    });
  return (
    <Menu
      label="Switch app"
      items={items}
      trigger={<Button variant="ghost" icon={<Icon name="bi:grid-3x3-gap" />} label="Switch app" />}
    />
  );
}

function AccountMenu({ login }: { login: string | null }) {
  const { required, logout } = useAuth();
  const items: MenuItem[] = [
    {
      type: 'group',
      label: login ? 'Signed in to GitHub' : 'Not connected to GitHub',
      items: [
        ...(login
          ? [
              {
                id: 'profile',
                label: login,
                icon: (
                  <Avatar
                    size="sm"
                    name={login}
                    src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
                  />
                ),
                to: `https://github.com/${encodeURIComponent(login)}`,
              },
            ]
          : []),
        { id: 'settings', label: 'Settings', icon: <Icon name="bi:gear" />, to: '/settings' },
        ...(required
          ? [
              { type: 'separator' as const },
              {
                id: 'sign-out',
                label: 'Sign out',
                icon: <Icon name="bi:box-arrow-right" />,
                onSelect: () => void logout(),
              },
            ]
          : []),
      ],
    },
  ];
  return (
    <Menu
      label="Account"
      align="end"
      items={items}
      // An Avatar as the button's face fails axe (label-content-name-mismatch: its initials are text), so the
      // picture sits in the menu.
      trigger={<Button variant="ghost" label="Account" icon={<Icon name="bi:person-circle" />} />}
    />
  );
}

function SyncFact() {
  const { data: status, isError } = useStatus();
  if (status?.syncing) return <>Syncing…</>;
  if (status?.lastSyncAt)
    return (
      <>
        {status.lastSyncOk === false ? 'Sync failed' : 'Synced'} <RelativeTime date={status.lastSyncAt} />
      </>
    );
  return <>{isError ? 'Status unavailable' : 'Never synced'}</>;
}

/** The side navigation shell around every page: the views, the settings, the sync state. */
export function Frame({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { settings, loaded } = useSettings();
  const { views, loaded: viewsLoaded } = useViews();
  const counts = useViewCounts(views, settings, loaded && viewsLoaded);
  const status = useStatus().data;
  const refresh = useRefresh();
  const version = useVersion().data;

  // A sync that finished brings new items: reload every list.
  const lastSync = status?.lastSyncAt ?? null;
  const seen = useRef(lastSync);
  useEffect(() => {
    if (seen.current !== null && seen.current !== lastSync) {
      void client.invalidateQueries({ queryKey: keys.allItems });
      void client.invalidateQueries({ queryKey: keys.repos });
    }
    seen.current = lastSync;
  }, [lastSync, client]);

  useHotkey({
    id: 'refresh',
    keys: 'R',
    label: 'Refresh from GitHub',
    group: 'App',
    run: () => void refresh(),
  });

  const nav: NavGroup[] = [
    {
      id: 'views',
      label: 'Views',
      items: views.map((v) => ({
        id: `view-${v.id}`,
        label: v.name,
        icon: viewIcon(v),
        to: `/views/${v.id}`,
        counter: counts[v.id],
      })),
    },
    {
      id: 'app',
      label: 'App',
      items: [{ id: 'settings', label: 'Settings', icon: 'bi:gear', to: '/settings' }],
    },
  ];

  const footer: FooterFact[] = [
    { id: 'sync', value: <SyncFact /> },
    ...(version ? [{ id: 'version', label: 'Version', value: version }] : []),
    { id: 'source', value: 'Source', to: REPO_URL },
    { id: 'issues', value: 'Issues', to: `${REPO_URL}/issues` },
    {
      id: 'shortcuts',
      value: (
        <HotkeysHelp
          trigger={
            <Button variant="link" size="sm">
              Keyboard shortcuts
            </Button>
          }
        />
      ),
    },
  ];

  const syncing = status?.syncing ?? false;
  return (
    <SideNavShell
      brand={BRAND}
      nav={nav}
      actions={
        <>
          <MemberSwitcher />
          <Tooltip text="Refresh from GitHub">
            <Button
              variant="ghost"
              icon={<Icon name="bi:arrow-repeat" />}
              label="Refresh from GitHub"
              loading={syncing}
              onClick={() => void refresh()}
            />
          </Tooltip>
          <AccountMenu login={status?.githubLogin ?? null} />
        </>
      }
      footer={footer}
      storageKey="octotally.sidenav"
      tabletCollapsed={false}
    >
      {children}
    </SideNavShell>
  );
}
