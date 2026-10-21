import { AppsIcon, CheckIcon, PackageIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu, Header, IconButton } from '@primer/react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { switcherMembers } from '../lib/siblings';

/** 16px icon from another app; falls back to a generic octicon when it does not load. */
function SiteIcon({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <PackageIcon />;
  return (
    <img src={src} alt="" width={16} height={16} className="switcher-icon" onError={() => setBroken(true)} />
  );
}

/** Octoforge and its members, from the list Octoforge pushes. Hidden when there is no list. */
export function MemberSwitcher() {
  const { siblings } = useApp();
  if (!siblings) return null;
  const members = switcherMembers(siblings);

  return (
    <Header.Item>
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton icon={AppsIcon} aria-label="Switch app" variant="invisible" />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay width="medium" align="start">
          <ActionList aria-label="Octoforge apps">
            <ActionList.LinkItem href={siblings.forge.url}>
              <ActionList.LeadingVisual>
                <SiteIcon src={siblings.forge.icon ?? null} />
              </ActionList.LeadingVisual>
              {siblings.forge.title}
            </ActionList.LinkItem>
            {members.length > 0 && (
              <>
                <ActionList.Divider />
                <ActionList.Group>
                  <ActionList.GroupHeading>Members</ActionList.GroupHeading>
                  {members.map((m) => (
                    <ActionList.LinkItem
                      key={m.key}
                      href={m.url}
                      active={m.current}
                      aria-current={m.current ? 'page' : undefined}
                    >
                      <ActionList.LeadingVisual>
                        <SiteIcon src={m.icon} />
                      </ActionList.LeadingVisual>
                      {m.title}
                      {m.current && (
                        <ActionList.TrailingVisual>
                          <CheckIcon aria-label="This app" />
                        </ActionList.TrailingVisual>
                      )}
                    </ActionList.LinkItem>
                  ))}
                </ActionList.Group>
              </>
            )}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </Header.Item>
  );
}
