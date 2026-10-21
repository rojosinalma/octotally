import { useState } from 'react';
import { Ui } from 'tailor-react';
import { useApp } from '../hooks/useApp';
import { switcherMembers } from '../lib/siblings';

/** 16px icon from another app; falls back to a generic icon when it does not load. */
function SiteIcon({ src }: { src: string | null }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <Ui.Icon name="lucide-package" />;
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
    <Ui.Menu
      className="switcher"
      variant="ghost"
      summaryClassName="switcher-trigger"
      trigger={<Ui.Icon name="bi-grid-3x3-gap" label="Switch app" />}
    >
      <li>
        <a className="t-menu-item" role="menuitem" href={siblings.forge.url}>
          <SiteIcon src={siblings.forge.icon ?? null} />
          {siblings.forge.title}
        </a>
      </li>
      {members.length > 0 && (
        <>
          <Ui.Menu.Divider />
          <Ui.Menu.Header>Members</Ui.Menu.Header>
          {members.map((m) => (
            <li key={m.key}>
              <a
                className="t-menu-item"
                role="menuitem"
                href={m.url}
                aria-current={m.current ? 'page' : undefined}
              >
                <SiteIcon src={m.icon} />
                {m.title}
                {m.current && <Ui.Icon name="bi-check2" label="This app" className="switcher-current" />}
              </a>
            </li>
          ))}
        </>
      )}
    </Ui.Menu>
  );
}
