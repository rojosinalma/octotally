import { useEffect, useState } from 'react';
import { Ui } from 'tailor-react';
import { api } from '../api';

const REPO_URL = 'https://github.com/rojosinalma/octotally';

/** Footer content; `Ui.AppShell foot` wraps it in the `.t-footer` footer. */
export function Footer() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    api
      .version()
      .then((v) => setVersion(v))
      .catch(() => setVersion(null));
  }, []);
  return (
    <>
      <Ui.Footer.Repo href={REPO_URL} target="_blank" rel="noreferrer" label="Octotally on GitHub">
        <Ui.Icon name="simple-icons-github" />
      </Ui.Footer.Repo>
      <nav className="footer-links" aria-label="Project">
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
          Issues
        </a>
        <a href={`${REPO_URL}/discussions`} target="_blank" rel="noreferrer">
          Discussions
        </a>
        <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
          AGPL-3.0
        </a>
      </nav>
      <Ui.Footer.End>
        <Ui.Footer.Pickers parts={['mode']} />
        {version && <Ui.Footer.Version>Octotally v{version}</Ui.Footer.Version>}
      </Ui.Footer.End>
    </>
  );
}
