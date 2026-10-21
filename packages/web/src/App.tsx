import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Ui } from 'tailor-react';
import { api, onAuthError } from './api';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { AppProvider } from './hooks/useApp';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { SettingsPage } from './pages/Settings';
import { useRoute } from './router';
import { ThemeSync } from './theme';

type Auth = { state: 'loading' } | { state: 'login' } | { state: 'ready'; required: boolean };

function Routes() {
  const route = useRoute();
  const [shortcuts, setShortcuts] = useState(false);
  const show = useCallback(() => setShortcuts(true), []);
  return (
    <>
      {route.path === '/settings' ? (
        <SettingsPage onShowShortcuts={show} />
      ) : (
        <Dashboard onShowShortcuts={show} />
      )}
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <Ui.Provider>{children}</Ui.Provider>;
}

export function App() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' });

  const check = useCallback(async () => {
    try {
      const r = await api.authStatus();
      setAuth(r.required && !r.authenticated ? { state: 'login' } : { state: 'ready', required: r.required });
    } catch {
      // No auth endpoint (or server down): try the app anyway; API errors surface in the UI.
      setAuth({ state: 'ready', required: false });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);
  useEffect(() => onAuthError(() => setAuth({ state: 'login' })), []);

  if (auth.state === 'loading') {
    return (
      <Shell>
        <div className="app-loading">
          <Ui.Spinner size="lg" />
        </div>
      </Shell>
    );
  }
  if (auth.state === 'login') {
    return (
      <Shell>
        <LoginPage onLoggedIn={() => void check()} />
      </Shell>
    );
  }
  return (
    <Shell>
      <AppProvider authRequired={auth.required} onLoggedOut={() => setAuth({ state: 'login' })}>
        <ThemeSync />
        <Routes />
      </AppProvider>
    </Shell>
  );
}
