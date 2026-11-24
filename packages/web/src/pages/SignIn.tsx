import { type FormEvent, useId, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Field,
  Page,
  Secret,
  ShellFooter,
  ShellMain,
  ShellRoot,
  Stack,
} from 'tailor/core';
import { api } from '../api';

/**
 * The password of the instance (AUTH_PASSWORD). Shown instead of the app until it is right.
 *
 * The reference puts a sign-in page in the bare shell, but a project holds one shell (sidenav here), and
 * SignInPage always asks for a user name: so the frame is the shell parts of core with no navigation, and
 * the form is a Card with the password only.
 */
export function SignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const main = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [missing, setMissing] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) {
      setMissing('Enter the password');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await api.login(password);
      await onSignedIn();
    } catch (e) {
      setError((e as Error).message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ShellRoot shell="bare" mainId={main}>
      <ShellMain id={main}>
        <Page
          title="Sign in to Octotally"
          description="This instance asks for its password."
          width="readable"
        >
          <Card>
            <form method="post" noValidate onSubmit={(e) => void submit(e)}>
              <Stack gap="4">
                {error ? <Alert tone="danger">{error}</Alert> : null}
                <Field label="Password" error={missing}>
                  <Secret
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onValueChange={(v) => {
                      setPassword(v);
                      setMissing(undefined);
                    }}
                  />
                </Field>
                <Button type="submit" variant="primary" loading={busy}>
                  Sign in
                </Button>
              </Stack>
            </form>
          </Card>
        </Page>
      </ShellMain>
      <ShellFooter theme={['mode']} />
    </ShellRoot>
  );
}
