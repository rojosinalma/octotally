import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type SaveResult, themeOptions, Ui, useTailorTheme } from 'tailor-react';
import { api } from '../api';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { useApp } from '../hooks/useApp';
import { useToast } from '../hooks/useToast';
import { absoluteTime, relativeTime } from '../lib/format';
import { parseSetting, type SettingKey } from '../lib/settings';
import { linkClick } from '../router';

const SECTIONS = [
  ['token', 'GitHub token'],
  ['sync', 'Sync'],
  ['digest', 'Discord digest'],
  ['appearance', 'Appearance'],
] as const;

const TIMEZONES: string[] = (() => {
  try {
    return (
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        'timeZone',
      ) ?? ['UTC']
    );
  } catch {
    return ['UTC'];
  }
})();

/** Help popover of a settings row. */
/** How long the test button shows "Sent" after a successful test. */
const SENT_MS = 2500;

const help = (label: string, text: ReactNode) => ({ label: `About ${label.toLowerCase()}`, children: text });

export function SettingsPage({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { settings, settingsLoaded, updateSettings, status, views } = useApp();
  const { toast } = useToast();
  const theme = useTailorTheme();
  const [testing, setTesting] = useState(false);
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(sentTimer.current), []);
  const [reveal, setReveal] = useState(false);

  const save = async (key: string, value: string): Promise<SaveResult> => {
    const parsed = parseSetting(key as SettingKey, value);
    if ('error' in parsed) return { ok: false, message: parsed.error };
    return updateSettings(parsed.patch, { quiet: true });
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await api.testNotifier('discord');
      setSent(true);
      window.clearTimeout(sentTimer.current);
      sentTimer.current = window.setTimeout(() => setSent(false), SENT_MS);
    } catch (e) {
      toast('Test failed', { description: (e as Error).message, variant: 'critical' });
    } finally {
      setTesting(false);
    }
  };

  const tokenOk = Boolean(status?.githubLogin);

  return (
    <Ui.AppShell
      nav={<Header onShowShortcuts={onShowShortcuts} />}
      side={
        <Ui.Sidebar label="Settings sections">
          <Ui.Sidebar.Group>Settings</Ui.Sidebar.Group>
          {SECTIONS.map(([id, title]) => (
            <Ui.Sidebar.Item key={id} href={`#${id}`}>
              {title}
            </Ui.Sidebar.Item>
          ))}
        </Ui.Sidebar>
      }
      foot={<Footer />}
    >
      <Ui.Page.Header>
        <Ui.Page.Back href="/" onClick={linkClick('/')} aria-label="Back to items" />
        <Ui.Page.Title>Settings</Ui.Page.Title>
        <Ui.Page.Lead>Changes save automatically.</Ui.Page.Lead>
      </Ui.Page.Header>

      <Ui.Stack gap="5" className="settings-page">
        <Ui.Section title="GitHub token" id="token">
          {status === null ? (
            <Ui.Cluster gap="2" align="center" aria-busy="true">
              <Ui.Spinner size="sm" label={null} />
              <span className="t-muted">Loading status…</span>
            </Ui.Cluster>
          ) : (
            <Ui.Facts>
              <dt>Status</dt>
              <dd>
                {tokenOk ? (
                  <span className="t-tone-text" data-tone="success">
                    <Ui.Icon name="bi-check-circle" /> Connected as <strong>{status.githubLogin}</strong>
                  </span>
                ) : (
                  <span className="t-tone-text" data-tone="danger">
                    <Ui.Icon name="bi-exclamation-triangle" /> Not connected — set <code>GITHUB_TOKEN</code>{' '}
                    and restart
                  </span>
                )}
              </dd>
              <dt>Rate limit</dt>
              <dd>
                {status.githubRateRemaining ?? '—'} requests left
                {status.githubRateResetAt ? `, resets ${relativeTime(status.githubRateResetAt)}` : ''}
              </dd>
              <dt>Last sync</dt>
              <dd>
                <Ui.Cluster gap="2" align="center">
                  <span data-tip={absoluteTime(status.lastSyncAt) || undefined}>
                    {status.lastSyncAt ? relativeTime(status.lastSyncAt) : 'never'}
                  </span>
                  {status.lastSyncOk === false && (
                    <Ui.Badge tone="danger" size="xs">
                      failed
                    </Ui.Badge>
                  )}
                  {status.syncing && (
                    <Ui.Badge tone="accent" size="xs">
                      syncing
                    </Ui.Badge>
                  )}
                </Ui.Cluster>
              </dd>
              <dt>Items tracked</dt>
              <dd>{status.itemCount}</dd>
              {status.lastError && (
                <>
                  <dt>Last error</dt>
                  <dd className="t-tone-text" data-tone="danger">
                    {status.lastError}
                  </dd>
                </>
              )}
            </Ui.Facts>
          )}
        </Ui.Section>

        {!settingsLoaded ? (
          <Ui.Cluster gap="2" align="center" aria-busy="true">
            <Ui.Spinner size="sm" label={null} />
            <span className="t-muted">Loading settings…</span>
          </Ui.Cluster>
        ) : (
          <Ui.Settings save={save}>
            <Ui.Section title="Sync" id="sync">
              <Ui.Settings.Row
                label="Active window"
                htmlFor="activeWindowDays"
                help={help(
                  'Active window',
                  'An item counts as active when it had activity within this many days. Used by the Active view.',
                )}
              >
                <Ui.InputGroup>
                  <Ui.Input
                    id="activeWindowDays"
                    type="number"
                    min={1}
                    max={365}
                    data-setting="activeWindowDays"
                    defaultValue={settings.activeWindowDays}
                  />
                  <Ui.InputAddon>days</Ui.InputAddon>
                </Ui.InputGroup>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Poll interval"
                htmlFor="pollIntervalMin"
                setting="pollIntervalMin"
                help={help('Poll interval', 'How often GitHub is checked for new activity.')}
              >
                <Ui.DurationInput id="pollIntervalMin" defaultValue={settings.pollIntervalMin * 60} />
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Maximum backoff"
                htmlFor="backoffMaxMin"
                setting="backoffMaxMin"
                help={help(
                  'Maximum backoff',
                  'After GitHub errors or rate limiting, polling slows down exponentially up to this limit.',
                )}
              >
                <Ui.DurationInput id="backoffMaxMin" defaultValue={settings.backoffMaxMin * 60} />
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Activity kept per item"
                htmlFor="activityKeep"
                help={help(
                  'Activity kept per item',
                  "Number of recent events stored for each item's timeline.",
                )}
              >
                <Ui.InputGroup>
                  <Ui.Input
                    id="activityKeep"
                    type="number"
                    min={1}
                    max={500}
                    data-setting="activityKeep"
                    defaultValue={settings.activityKeep}
                  />
                  <Ui.InputAddon>events</Ui.InputAddon>
                </Ui.InputGroup>
              </Ui.Settings.Row>
            </Ui.Section>

            <Ui.Section title="Discord digest" id="digest">
              <Ui.Settings.Row
                label="Webhook URL"
                htmlFor="discordWebhookUrl"
                help={help(
                  'Webhook URL',
                  'Discord channel webhook (https://discord.com/api/webhooks/…). Leave empty to disable notifications.',
                )}
              >
                <div className="webhook">
                  <Ui.InputGroup className="webhook-input">
                    <Ui.Input
                      id="discordWebhookUrl"
                      type={reveal ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="https://discord.com/api/webhooks/…"
                      data-setting="discordWebhookUrl"
                      defaultValue={settings.discordWebhookUrl}
                    />
                    <Ui.Button
                      iconOnly
                      aria-label={reveal ? 'Hide webhook URL' : 'Show webhook URL'}
                      tip={reveal ? 'Hide' : 'Show'}
                      pressed={reveal}
                      onClick={() => setReveal((r) => !r)}
                    >
                      <Ui.Icon name={reveal ? 'bi-eye-slash' : 'bi-eye'} />
                    </Ui.Button>
                  </Ui.InputGroup>
                  <Ui.Button
                    busy={testing}
                    disabled={!settings.discordWebhookUrl}
                    onClick={() => void sendTest()}
                  >
                    {sent ? (
                      <>
                        <Ui.Icon name="bi-check2" /> Sent
                      </>
                    ) : (
                      <>
                        <Ui.Icon name="bi-send" /> Send test message
                      </>
                    )}
                  </Ui.Button>
                </div>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Daily digest"
                htmlFor="digestDaily"
                setting="digestDaily"
                help={help('Daily digest', 'One message per day listing what still needs you.')}
              >
                <Ui.Check
                  switch
                  id="digestDaily"
                  label="Send the daily digest"
                  defaultChecked={settings.digestDaily}
                />
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Digest hour"
                htmlFor="digestHour"
                help={help('Digest hour', 'Local hour (0–23) the daily digest is sent.')}
              >
                <Ui.InputGroup>
                  <Ui.Input
                    id="digestHour"
                    type="number"
                    min={0}
                    max={23}
                    data-setting="digestHour"
                    defaultValue={settings.digestHour}
                  />
                  <Ui.InputAddon>h</Ui.InputAddon>
                </Ui.InputGroup>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Timezone"
                htmlFor="timezone"
                setting="timezone"
                help={help('Timezone', 'IANA timezone the digest hour refers to.')}
              >
                <Ui.Select id="timezone" defaultValue={settings.timezone}>
                  {!TIMEZONES.includes(settings.timezone) && (
                    <option value={settings.timezone}>{settings.timezone}</option>
                  )}
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Ui.Select>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Real-time pings"
                htmlFor="digestRealtime"
                setting="digestRealtime"
                help={help(
                  'Real-time pings',
                  'A short message whenever new activity arrives on something you are involved in.',
                )}
              >
                <Ui.Check
                  switch
                  id="digestRealtime"
                  label="Ping on new activity"
                  defaultChecked={settings.digestRealtime}
                />
              </Ui.Settings.Row>
            </Ui.Section>

            <Ui.Section title="Appearance" id="appearance">
              <Ui.Settings.Row
                label="Skin"
                htmlFor="skin"
                setting="skin"
                help={help(
                  'Skin',
                  'The design system the page is drawn with. Primer is the GitHub look. The sun/moon button in the footer switches between dark and light.',
                )}
              >
                <Ui.Select id="skin" defaultValue={theme.skin}>
                  {themeOptions(theme.config, 'skin').map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </Ui.Select>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Palette"
                htmlFor="palette"
                setting="palette"
                help={help('Palette', 'The colours. Every palette has a dark and a light mode.')}
              >
                <Ui.Select id="palette" defaultValue={theme.palette}>
                  {themeOptions(theme.config, 'palette').map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </Ui.Select>
              </Ui.Settings.Row>
              <Ui.Settings.Row
                label="Default view"
                htmlFor="defaultView"
                setting="defaultView"
                help={help('Default view', 'The view shown when you open Octotally.')}
              >
                <Ui.Select id="defaultView" defaultValue={settings.defaultView}>
                  {views.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Ui.Select>
              </Ui.Settings.Row>
            </Ui.Section>
          </Ui.Settings>
        )}
      </Ui.Stack>
    </Ui.AppShell>
  );
}
