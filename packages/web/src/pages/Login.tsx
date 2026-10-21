import { type FormEvent, useState } from 'react';
import { Ui } from 'tailor-react';
import { api } from '../api';

export function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.login(password);
      onLoggedIn();
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <Ui.Card className="login-card">
        <Ui.Card.Body>
          <Ui.Form onSubmit={(e) => void submit(e)} className="t-stack">
            <h1 className="t-page-title login-title">
              <img src="/favicon.svg" alt="" width={28} height={28} /> Octotally
            </h1>
            <p className="t-muted">Enter the password configured for this instance.</p>
            <Ui.Field label="Password" error={error}>
              <Ui.Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </Ui.Field>
            <Ui.Button type="submit" variant="primary" busy={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Ui.Button>
          </Ui.Form>
        </Ui.Card.Body>
      </Ui.Card>
    </main>
  );
}
