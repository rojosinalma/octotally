import { MarkGithubIcon } from '@primer/octicons-react';
import { Link } from '@primer/react';
import { useEffect, useState } from 'react';
import { api } from '../api';

const REPO_URL = 'https://github.com/rojosinalma/octotally';

export function Footer() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    api
      .version()
      .then((v) => setVersion(v))
      .catch(() => setVersion(null));
  }, []);
  return (
    <footer className="app-footer fg-muted">
      <Link href={REPO_URL} target="_blank" rel="noreferrer" muted className="app-footer-link">
        <MarkGithubIcon size={14} aria-hidden /> Octotally{version ? ` v${version}` : ''}
      </Link>
      <span aria-hidden>·</span>
      <Link href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" muted>
        Issues
      </Link>
      <span aria-hidden>·</span>
      <Link href={`${REPO_URL}/discussions`} target="_blank" rel="noreferrer" muted>
        Discussions
      </Link>
      <span aria-hidden>·</span>
      <Link href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" muted>
        AGPL-3.0
      </Link>
    </footer>
  );
}
