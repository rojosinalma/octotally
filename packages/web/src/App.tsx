import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { routePendingComponent } from 'tailor/core';
import { api, onAuthError } from './api';
import { type Auth, AuthContext } from './auth';
import { SignIn } from './pages/SignIn';
import { router } from './router';
import { ThemeSync } from './theme';

/** Asks the server whether a password is needed, then shows the sign-in page or the app. */
export function App() {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ['auth'],
    // No auth endpoint (or the server is down): try the app anyway; API errors show in the pages.
    queryFn: () => api.authStatus().catch(() => ({ authenticated: true, required: false })),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => onAuthError(() => setSignedOut(true)), []);

  const auth = useMemo<Auth>(
    () => ({
      required: status.data?.required ?? false,
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setSignedOut(true);
        }
      },
    }),
    [status.data?.required],
  );

  if (!status.data) return routePendingComponent();
  if (signedOut || (status.data.required && !status.data.authenticated))
    return (
      <SignIn
        onSignedIn={async () => {
          await client.invalidateQueries();
          setSignedOut(false);
        }}
      />
    );
  return (
    <AuthContext value={auth}>
      <ThemeSync />
      <RouterProvider router={router} />
    </AuthContext>
  );
}
