import { Spinner } from '@primer/react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { api, onAuthError } from './api';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { AppProvider, useApp } from './hooks/useApp';
import { ToastProvider } from './hooks/useToast';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/Login';
import { SettingsPage } from './pages/Settings';
import { useRoute } from './router';
import { readCachedTheme, ThemeRoot } from './theme';

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
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
    </>
  );
}

/** Applies the server-side theme once settings arrive; the cached one covers the first paint. */
function Themed({ children }: { children: ReactNode }) {
  const { settings, settingsLoaded } = useApp();
  const theme = settingsLoaded ? settings.theme : readCachedTheme();
  return <ThemeRoot theme={theme}>{children}</ThemeRoot>;
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
      <ThemeRoot theme={readCachedTheme()}>
        <div className="app-loading">
          <Spinner srText="Loading" />
        </div>
      </ThemeRoot>
    );
  }
  if (auth.state === 'login') {
    return (
      <ThemeRoot theme={readCachedTheme()}>
        <LoginPage onLoggedIn={() => void check()} />
      </ThemeRoot>
    );
  }
  return (
    <ToastProvider>
      <AppProvider authRequired={auth.required} onLoggedOut={() => setAuth({ state: 'login' })}>
        <Themed>
          <Routes />
        </Themed>
      </AppProvider>
    </ToastProvider>
  );
}
