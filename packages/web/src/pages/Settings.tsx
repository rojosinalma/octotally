import type { Settings as AppSettings, View } from '@octotally/shared';
import { useState } from 'react';
import {
  Button,
  Combobox,
  Fact,
  Facts,
  Icon,
  NumberField,
  Page,
  RelativeTime,
  Secret,
  Select,
  Skeleton,
  StateLabel,
  Switch,
  useTheme,
  useToast,
} from 'tailor/core';
import { Duration, Setting, Settings, SettingsSection, useAutoSave } from 'tailor/forms';
import { api } from '../api';
import { parseSetting, type SettingKey } from '../lib/settings';
import { useSettings, useStatus, useUpdateSettings, useViews } from '../queries';

const SECTIONS = [
  { id: 'token', label: 'GitHub', icon: <Icon name="bi:github" /> },
  { id: 'sync', label: 'Sync', icon: <Icon name="bi:arrow-repeat" /> },
  { id: 'digest', label: 'Discord digest', icon: <Icon name="bi:send" /> },
  { id: 'appearance', label: 'Appearance', icon: <Icon name="bi:palette" /> },
];

const TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
})();

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, '0')}:00`,
}));

const MODES = [
  { value: 'auto', label: 'Same as the device' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

/** Text saves a moment after the last key; a choice or a switch saves at once. */
const TEXT_DELAY_MS = 800;

/** Saves one setting: the value as the row has it, checked by parseSetting. */
function useSave(key: SettingKey) {
  const update = useUpdateSettings();
  return async (value: unknown) => {
    const parsed = parseSetting(key, value === null || value === undefined ? '' : String(value));
    if ('error' in parsed) return { ok: false, message: parsed.error };
    return update(parsed.patch);
  };
}

function TokenSection() {
  const { data: status } = useStatus();
  if (!status) return <Skeleton lines={4} />;
  return (
    <Facts>
      <Fact name="Status">
        {status.githubLogin ? (
          <StateLabel tone="success">Connected as {status.githubLogin}</StateLabel>
        ) : (
          <StateLabel tone="danger">Not connected: set GITHUB_TOKEN and restart</StateLabel>
        )}
      </Fact>
      <Fact name="Rate limit">
        {status.githubRateRemaining ?? '—'} requests left
        {status.githubRateResetAt ? (
          <>
            , resets <RelativeTime date={status.githubRateResetAt} />
          </>
        ) : null}
      </Fact>
      <Fact name="Last sync">
        {status.syncing ? (
          'Syncing now'
        ) : status.lastSyncAt ? (
          <>
            <RelativeTime date={status.lastSyncAt} />
            {status.lastSyncOk === false ? ', failed' : ''}
          </>
        ) : (
          'Never'
        )}
      </Fact>
      <Fact name="Items tracked">{status.itemCount}</Fact>
      {status.lastError ? <Fact name="Last error">{status.lastError}</Fact> : null}
    </Facts>
  );
}

function TestMessage({ webhook }: { webhook: string }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  return (
    <Button
      icon={<Icon name="bi:send" />}
      loading={sending}
      disabled={!webhook}
      onClick={async () => {
        setSending(true);
        try {
          await api.testNotifier('discord');
          toast('success', 'Look in the Discord channel.', { title: 'Test message sent' });
        } catch (e) {
          toast('danger', (e as Error).message, { title: 'Test failed' });
        } finally {
          setSending(false);
        }
      }}
    >
      Send test message
    </Button>
  );
}

function ModeRow({ mode: start }: { mode: AppSettings['mode'] }) {
  const mode = useAutoSave<string>({ value: start, save: useSave('mode') });
  return (
    <Setting label="Mode" description="The mode button in the side column sets it too." state={mode}>
      <Select name="mode" options={MODES} value={mode.value} onValueChange={mode.setValue} />
    </Setting>
  );
}

function Rows({ settings, views }: { settings: AppSettings; views: View[] }) {
  const theme = useTheme();
  const activeWindow = useAutoSave<number | null>({
    value: settings.activeWindowDays,
    save: useSave('activeWindowDays'),
  });
  const poll = useAutoSave<number | null>({
    value: settings.pollIntervalMin * 60,
    save: useSave('pollIntervalMin'),
  });
  const backoff = useAutoSave<number | null>({
    value: settings.backoffMaxMin * 60,
    save: useSave('backoffMaxMin'),
  });
  const keep = useAutoSave<number | null>({ value: settings.activityKeep, save: useSave('activityKeep') });
  const webhook = useAutoSave({
    value: settings.discordWebhookUrl,
    save: useSave('discordWebhookUrl'),
    delay: TEXT_DELAY_MS,
  });
  const daily = useAutoSave({ value: settings.digestDaily, save: useSave('digestDaily') });
  const hour = useAutoSave({ value: String(settings.digestHour), save: useSave('digestHour') });
  const timezone = useAutoSave<string | null>({ value: settings.timezone, save: useSave('timezone') });
  const realtime = useAutoSave({ value: settings.digestRealtime, save: useSave('digestRealtime') });
  const skin = useAutoSave({ value: theme.skin, save: useSave('skin') });
  const palette = useAutoSave({ value: theme.palette, save: useSave('palette') });
  const defaultView = useAutoSave({ value: settings.defaultView, save: useSave('defaultView') });

  const labels = theme.config.labels ?? {};
  const choices = (ids: readonly string[]) => ids.map((id) => ({ value: id, label: labels[id] ?? id }));
  const zones = TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES];

  return (
    <Settings sections={SECTIONS}>
      <SettingsSection id="token" title="GitHub" description="The token Octotally reads GitHub with.">
        <TokenSection />
      </SettingsSection>

      <SettingsSection id="sync" title="Sync">
        <Setting
          label="Active window"
          description="An item counts as active with activity in this many days. The Active view uses it."
          state={activeWindow}
        >
          <NumberField
            name="activeWindowDays"
            min={1}
            max={365}
            unit="days"
            value={activeWindow.value}
            onValueChange={activeWindow.setValue}
          />
        </Setting>
        <Setting label="Poll interval" description="How often GitHub is asked for new activity." state={poll}>
          <Duration
            label="Poll interval"
            name="pollIntervalMin"
            units={['minutes', 'hours', 'days']}
            min={60}
            value={poll.value}
            onValueChange={poll.setValue}
          />
        </Setting>
        <Setting
          label="Maximum backoff"
          description="After GitHub errors or rate limits, polling slows down up to this."
          state={backoff}
        >
          <Duration
            label="Maximum backoff"
            name="backoffMaxMin"
            units={['minutes', 'hours', 'days']}
            min={60}
            value={backoff.value}
            onValueChange={backoff.setValue}
          />
        </Setting>
        <Setting
          label="Activity kept per item"
          description="Recent events stored for the timeline of each item."
          state={keep}
        >
          <NumberField
            name="activityKeep"
            min={1}
            max={500}
            unit="events"
            value={keep.value}
            onValueChange={keep.setValue}
          />
        </Setting>
      </SettingsSection>

      <SettingsSection id="digest" title="Discord digest" description="Messages about what moved.">
        <Setting
          label="Webhook URL"
          description="A Discord channel webhook (https://discord.com/api/webhooks/…). Empty turns messages off."
          state={webhook}
        >
          <Secret
            name="discordWebhookUrl"
            autoComplete="off"
            placeholder="https://discord.com/api/webhooks/…"
            value={webhook.value}
            onValueChange={webhook.setValue}
          />
        </Setting>
        <Setting label="Test message" description="Sends one message to the webhook now.">
          <TestMessage webhook={settings.discordWebhookUrl} />
        </Setting>
        <Setting
          label="Daily digest"
          description="One message a day with what still needs you."
          state={daily}
        >
          <Switch
            name="digestDaily"
            label="Daily digest"
            checked={daily.value}
            onCheckedChange={daily.setValue}
          />
        </Setting>
        <Setting label="Digest hour" description="When the daily digest goes out." state={hour}>
          <Select name="digestHour" options={HOURS} value={hour.value} onValueChange={hour.setValue} />
        </Setting>
        <Setting label="Time zone" description="The zone of the digest hour." state={timezone}>
          <Combobox
            name="timezone"
            options={zones.map((z) => ({ value: z, label: z }))}
            value={timezone.value}
            onValueChange={(z) => z && timezone.setValue(z)}
            placeholder="Type a city"
          />
        </Setting>
        <Setting
          label="Real-time pings"
          description="A short message when new activity arrives on something you are part of."
          state={realtime}
        >
          <Switch
            name="digestRealtime"
            label="Real-time pings"
            checked={realtime.value}
            onCheckedChange={realtime.setValue}
          />
        </Setting>
      </SettingsSection>

      <SettingsSection
        id="appearance"
        title="Appearance"
        description="For every browser that opens Octotally."
      >
        <Setting label="Skin" description="The design system. Primer is the GitHub look." state={skin}>
          <Select
            name="skin"
            options={choices(theme.config.skins)}
            value={skin.value}
            onValueChange={skin.setValue}
          />
        </Setting>
        <Setting
          label="Palette"
          description="The colours. Each palette has a dark and a light mode."
          state={palette}
        >
          <Select
            name="palette"
            options={choices(theme.config.palettes)}
            value={palette.value}
            onValueChange={palette.setValue}
          />
        </Setting>
        {/* The mode button of the side column changes the mode too: the row starts again from the new value. */}
        <ModeRow key={settings.mode} mode={settings.mode} />
        <Setting label="Default view" description="The view that opens first." state={defaultView}>
          <Select
            name="defaultView"
            options={views.map((v) => ({ value: v.id, label: v.name }))}
            value={defaultView.value}
            onValueChange={defaultView.setValue}
          />
        </Setting>
      </SettingsSection>
    </Settings>
  );
}

/** The settings of the instance. Each change saves by itself. */
export function SettingsPage() {
  const { settings, loaded } = useSettings();
  const { views, loaded: viewsLoaded } = useViews();
  return (
    <Page title="Settings" description="Each change saves by itself." mode="fill" width="readable">
      {loaded && viewsLoaded ? <Rows settings={settings} views={views} /> : <Skeleton lines={8} />}
    </Page>
  );
}
