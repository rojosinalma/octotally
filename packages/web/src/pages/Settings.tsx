import type { Settings as SettingsT, Theme } from '@octotally/shared';
import { Settings as SettingsSchema } from '@octotally/shared';
import { AlertIcon, CheckCircleIcon, PaperAirplaneIcon } from '@primer/octicons-react';
import { Button, FormControl, Heading, Label, Select, TextInput, ToggleSwitch } from '@primer/react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { api } from '../api';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { useApp } from '../hooks/useApp';
import { useToast } from '../hooks/useToast';
import { absoluteTime, minutesToUnit, relativeTime, unitToMinutes } from '../lib/format';
import { THEME_LABELS, THEMES } from '../theme';

type DurationUnit = 'min' | 'h' | 'd';

/** Number + unit input that saves minutes on blur/Enter. */
function DurationInput({
  id,
  minutes,
  min,
  max,
  units,
  onSave,
}: {
  id: string;
  minutes: number;
  min: number;
  max: number;
  units: DurationUnit[];
  onSave: (minutes: number) => void;
}) {
  const initial = minutesToUnit(minutes);
  const [value, setValue] = useState(String(initial.value));
  const [unit, setUnit] = useState<DurationUnit>(
    units.includes(initial.unit) ? initial.unit : (units[0] ?? 'min'),
  );
  useEffect(() => {
    const u = minutesToUnit(minutes);
    setValue(String(u.value));
    setUnit(units.includes(u.unit) ? u.unit : (units[0] ?? 'min'));
  }, [minutes, units]);
  const commit = (v = value, u = unit) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;
    const total = Math.min(max, Math.max(min, unitToMinutes(n, u)));
    if (total !== minutes) onSave(total);
  };
  return (
    <div className="duration">
      <TextInput
        id={id}
        type="number"
        min={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="duration-value"
      />
      <Select
        aria-label="Unit"
        value={unit}
        onChange={(e) => {
          const u = e.target.value as DurationUnit;
          setUnit(u);
          commit(value, u);
        }}
      >
        {units.map((u) => (
          <Select.Option key={u} value={u}>
            {u === 'min' ? 'minutes' : u === 'h' ? 'hours' : 'days'}
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}

function NumberInput({
  id,
  value,
  min,
  max,
  suffix,
  onSave,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.round(Number(draft));
    if (!Number.isFinite(n)) return setDraft(String(value));
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onSave(clamped);
  };
  return (
    <TextInput
      id={id}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      trailingVisual={suffix ? () => <span>{suffix}</span> : undefined}
      className="number-input"
    />
  );
}

function Row({
  label,
  help,
  children,
  id,
}: {
  label: string;
  help: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <FormControl className="settings-row" id={id}>
      <FormControl.Label>{label}</FormControl.Label>
      <FormControl.Caption>{help}</FormControl.Caption>
      {children}
    </FormControl>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="settings-toggle">
      <div>
        <span id={id} className="settings-toggle-label">
          {label}
        </span>
        <p className="fg-muted settings-help">{help}</p>
      </div>
      <ToggleSwitch aria-labelledby={id} checked={checked} onChange={onChange} size="small" />
    </div>
  );
}

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

export function SettingsPage({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const { settings, updateSettings, status, views } = useApp();
  const { toast } = useToast();
  const [webhook, setWebhook] = useState(settings.discordWebhookUrl);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  useEffect(() => setWebhook(settings.discordWebhookUrl), [settings.discordWebhookUrl]);

  const save = <K extends keyof SettingsT>(key: K, value: SettingsT[K]) =>
    void updateSettings({ [key]: value });

  const saveWebhook = () => {
    const parsed = SettingsSchema.shape.discordWebhookUrl.safeParse(webhook.trim());
    if (!parsed.success) {
      setWebhookError('Must be an https:// URL (or empty to disable).');
      return;
    }
    setWebhookError(null);
    if (parsed.data !== settings.discordWebhookUrl) save('discordWebhookUrl', parsed.data);
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await api.testNotifier('discord');
      toast('Test message sent to Discord');
    } catch (e) {
      toast('Test failed', { description: (e as Error).message, variant: 'critical' });
    } finally {
      setTesting(false);
    }
  };

  const tokenOk = Boolean(status?.githubLogin);

  return (
    <div className="app-shell">
      <Header onShowShortcuts={onShowShortcuts} />
      <main className="settings-page">
        <Heading as="h1" className="settings-title">
          Settings
        </Heading>
        <p className="fg-muted">Changes save automatically.</p>

        <section className="settings-card" aria-labelledby="token-status">
          <h2 id="token-status" className="settings-section-title">
            GitHub token
          </h2>
          {status === null ? (
            <p className="fg-muted">Loading status…</p>
          ) : (
            <dl className="status-grid">
              <dt>Status</dt>
              <dd>
                {tokenOk ? (
                  <span className="fg-success">
                    <CheckCircleIcon /> Connected as <strong>{status.githubLogin}</strong>
                  </span>
                ) : (
                  <span className="fg-danger">
                    <AlertIcon /> Not connected — set <code>GITHUB_TOKEN</code> and restart
                  </span>
                )}
              </dd>
              <dt>Rate limit</dt>
              <dd>
                {status.githubRateRemaining ?? '—'} requests left
                {status.githubRateResetAt ? `, resets ${relativeTime(status.githubRateResetAt)}` : ''}
              </dd>
              <dt>Last sync</dt>
              <dd title={absoluteTime(status.lastSyncAt)}>
                {status.lastSyncAt ? relativeTime(status.lastSyncAt) : 'never'}
                {status.lastSyncOk === false && <Label variant="danger">failed</Label>}
                {status.syncing && <Label variant="accent">syncing</Label>}
              </dd>
              <dt>Items tracked</dt>
              <dd>{status.itemCount}</dd>
              {status.lastError && (
                <>
                  <dt>Last error</dt>
                  <dd className="fg-danger">{status.lastError}</dd>
                </>
              )}
            </dl>
          )}
        </section>

        <section className="settings-card" aria-labelledby="sync-heading">
          <h2 id="sync-heading" className="settings-section-title">
            Sync
          </h2>
          <Row
            label="Active window"
            help="An item counts as active when it had activity within this many days. Used by the Active view."
          >
            <NumberInput
              id="activeWindowDays"
              value={settings.activeWindowDays}
              min={1}
              max={365}
              suffix="days"
              onSave={(v) => save('activeWindowDays', v)}
            />
          </Row>
          <Row label="Poll interval" help="How often GitHub is checked for new activity.">
            <DurationInput
              id="pollIntervalMin"
              minutes={settings.pollIntervalMin}
              min={1}
              max={1440}
              units={['min', 'h']}
              onSave={(v) => save('pollIntervalMin', v)}
            />
          </Row>
          <Row
            label="Maximum backoff"
            help="After GitHub errors or rate limiting, polling slows down exponentially up to this limit."
          >
            <DurationInput
              id="backoffMaxMin"
              minutes={settings.backoffMaxMin}
              min={1}
              max={1440}
              units={['min', 'h']}
              onSave={(v) => save('backoffMaxMin', v)}
            />
          </Row>
          <Row label="Activity kept per item" help="Number of recent events stored for each item's timeline.">
            <NumberInput
              id="activityKeep"
              value={settings.activityKeep}
              min={1}
              max={500}
              suffix="events"
              onSave={(v) => save('activityKeep', v)}
            />
          </Row>
        </section>

        <section className="settings-card" aria-labelledby="digest-heading">
          <h2 id="digest-heading" className="settings-section-title">
            Discord digest
          </h2>
          <FormControl className="settings-row">
            <FormControl.Label>Webhook URL</FormControl.Label>
            <FormControl.Caption>
              Discord channel webhook (https://discord.com/api/webhooks/…). Leave empty to disable
              notifications.
            </FormControl.Caption>
            <TextInput
              block
              type="url"
              value={webhook}
              placeholder="https://discord.com/api/webhooks/…"
              onChange={(e) => setWebhook(e.target.value)}
              onBlur={saveWebhook}
              onKeyDown={(e) => e.key === 'Enter' && saveWebhook()}
              validationStatus={webhookError ? 'error' : undefined}
              trailingAction={
                <TextInput.Action
                  icon={PaperAirplaneIcon}
                  aria-label="Send test message"
                  onClick={() => void sendTest()}
                  disabled={testing || !settings.discordWebhookUrl}
                />
              }
            />
            {webhookError && <FormControl.Validation variant="error">{webhookError}</FormControl.Validation>}
          </FormControl>
          <Button
            leadingVisual={PaperAirplaneIcon}
            onClick={() => void sendTest()}
            disabled={testing || !settings.discordWebhookUrl}
            size="small"
          >
            Send test message
          </Button>
          <Toggle
            label="Daily digest"
            help="One message per day listing what still needs you."
            checked={settings.digestDaily}
            onChange={(v) => save('digestDaily', v)}
          />
          <div className="settings-inline">
            <Row label="Digest hour" help="Local hour (0–23) the daily digest is sent.">
              <NumberInput
                id="digestHour"
                value={settings.digestHour}
                min={0}
                max={23}
                suffix="h"
                onSave={(v) => save('digestHour', v)}
              />
            </Row>
            <Row label="Timezone" help="IANA timezone the digest hour refers to.">
              <Select
                value={settings.timezone}
                onChange={(e) => save('timezone', e.target.value)}
                aria-label="Timezone"
              >
                {!TIMEZONES.includes(settings.timezone) && (
                  <Select.Option value={settings.timezone}>{settings.timezone}</Select.Option>
                )}
                {TIMEZONES.map((tz) => (
                  <Select.Option key={tz} value={tz}>
                    {tz}
                  </Select.Option>
                ))}
              </Select>
            </Row>
          </div>
          <Toggle
            label="Real-time pings"
            help="A short message whenever new activity arrives on something you are involved in."
            checked={settings.digestRealtime}
            onChange={(v) => save('digestRealtime', v)}
          />
        </section>

        <section className="settings-card" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="settings-section-title">
            Appearance
          </h2>
          <Row
            label="Theme"
            help="All GitHub themes are available; “Sync with system” follows your OS light/dark preference."
          >
            <Select
              value={settings.theme}
              onChange={(e) => save('theme', e.target.value as Theme)}
              aria-label="Theme"
            >
              {THEMES.map((t) => (
                <Select.Option key={t} value={t}>
                  {THEME_LABELS[t]}
                </Select.Option>
              ))}
            </Select>
          </Row>
          <Row label="Default view" help="The view shown when you open Octotally.">
            <Select
              value={settings.defaultView}
              onChange={(e) => save('defaultView', e.target.value)}
              aria-label="Default view"
            >
              {views.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name}
                </Select.Option>
              ))}
            </Select>
          </Row>
        </section>
      </main>
      <Footer />
    </div>
  );
}
