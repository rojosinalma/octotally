# tailor 2.3.1: pack forms (Forms)

Validated forms, the settings page and the list and key-value editors.

Requires: core. Libraries (React kit): @tanstack/react-form@1.33.5, @tanstack/react-pacer@0.24.1. HTML kit: full.

SVG drawing data in the markup shows as `d="…"`, inline images as `data:…`, and markup over 4000 characters is cut. The HTML kit has each example whole in `reference/forms/<component>.html`.

<a id="duration"></a>

## Duration (`duration`)

A length of time as a number and a unit in words (seconds, minutes, hours, days). The value is in seconds; it starts in the largest unit that gives a whole number.

- React: `import { Duration } from "tailor/forms";`
- Classes: `t-duration`; parts: `t-duration-unit` the unit list's own field, which lays out as the list
- Props: `units`: seconds | minutes | hours | days
- HTML kit: script

Example: The largest whole unit

```tsx
<Stack>
  <Duration label="Backup interval" name="interval" defaultValue={7200} />
  <Duration label="Timeout" name="timeout" defaultValue={300} />
  <Duration label="Retry delay" name="retry" defaultValue={90} />
</Stack>
```

```html
<div class="t-stack"><input type="number" class="t-control t-input" data-t="duration" aria-label="Backup interval" name="interval" value="7200"/><input type="number" class="t-control t-input" data-t="duration" aria-label="Timeout" name="timeout" value="300"/><input type="number" class="t-control t-input" data-t="duration" aria-label="Retry delay" name="retry" value="90"/></div>
```

<a id="form"></a>

## Form (`form`)

A validated form that never reloads the page: fields check on blur and on submit (then on each change until valid), a failed submit focuses the first invalid field, the outcome shows as a toast and server errors go on their fields. React: useTailorForm with Form, FormField, FormSection, FormSummary and FormActions. HTML: a form with data-t="form" checks with the native rules; data-t-submit="fetch" sends it with fetch and keeps its submit button busy (Tailor.busy) and fires t:send as it sends (detail.data, the FormData): a JSON answer {ok, message, errors} shows as a toast and puts the errors on their fields; any other answer (a picture, a file) comes in the t:submit event as detail.blob with detail.response, and a picture goes into the t-media-fit named by data-t-result="<id>" (alt text from data-t-result-alt, where {file} is the name of the chosen file; React props result and resultAlt), which a button with data-t-download="<id>" then saves. The buttons may sit outside the form, such as in a dialog footer: Form takes an id, FormActions there names it by itself, other buttons take form="<id>".

- React: `import { useTailorForm, Form, FormField, FormSection, FormSummary, FormActions } from "tailor/forms";`
- Classes: `t-form`; parts: `t-form-field` one field of the form; data-span makes it full width in the grid layout; `t-form-section` a group of fields with a title; `t-form-section-title` the title of a section; `t-form-section-description` the line under the title of a section; `t-form-section-body` the fields of a section; `t-form-summary` the list of errors at the top after a failed submit, a danger alert; `t-form-summary-list` the links to the invalid fields; `t-form-actions` the row of buttons at the end, or in a dialog footer; the submit button is the only primary one
- Props: `layout`: stack | grid
- HTML kit: script

Example: Add a host

```tsx
<>
  <ToastRegion />
  <AddHost layout="stack" />
</>
```

```html
<form id="_R_2_" class="t-form" data-t="form" noValidate="" aria-label="Add host" data-t-submit="fetch" action="/api/hosts" method="post"><div class="t-form-summary" hidden=""></div><div class="t-form-field" id="_R_1m_"><div class="t-field"><label class="t-field-label" for="_R_hm_" id="_R_hm_-label">Host name<span class="t-field-required" aria-hidden="true">Required</span></label><div class="t-field-control"><input id="_R_hm_" required="" aria-describedby="_R_hm_-help" type="text" autoComplete="off" class="t-control t-input" name="name" value=""/></div><p class="t-field-help" id="_R_hm_-help">Lower-case letters, digits and dashes.</p><p class="t-field-error" id="_R_hm_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_2m_"><div class="t-field"><label class="t-field-label" for="_R_im_" id="_R_im_-label">Address<span class="t-field-required" aria-hidden="true">Required</span></label><div class="t-field-control"><input id="_R_im_" required="" type="text" autoComplete="off" class="t-control t-input" name="address" value=""/></div><p class="t-field-error" id="_R_im_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_3m_"><div class="t-field"><label class="t-field-label" for="_R_jm_" id="_R_jm_-label">Port<span class="t-field-required" aria-hidden="true">Required</span></label><div class="t-field-control"><input id="_R_jm_" required="" type="number" class="t-control t-input" data-t="number" min="1" max="65535" step="1" name="port" value="22"/></div><p class="t-field-error" id="_R_jm_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_4m_"><div class="t-field"><label class="t-field-label" for="_R_km_" id="_R_km_-label">Kind<span class="t-field-required" aria-hidden="true">Required</span></label><div class="t-field-control"><select class="t-control t-select" data-t="select" data-placeholder="Pick a kind" id="_R_km_" name="kind" required=""><option value="" hidden="" selected="">Pick a kind</option><option value="server">Server</option><option value="storage">Storage</option><option value="network">Network device</option></select></div><p class="t-field-error" id="_R_km_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_5m_"><div class="t-field"><label class="t-field-label" for="_R_lm_" id="_R_lm_-label">Contact email</label><div class="t-field-control"><input id="_R_lm_" aria-describedby="_R_lm_-help" type="email" placeholder="name@example.com" autoComplete="email" class="t-control t-input" name="email" value=""/></div><p class="t-field-help" id="_R_lm_-help">Alerts about the host go here.</p><p class="t-field-error" id="_R_lm_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_6m_"><div class="t-field"><label class="t-field-label" for="_R_mm_" id="_R_mm_-label">In service since</label><div class="t-field-control"><input type="date" class="t-control t-input" data-t="date" data-placeholder="Pick a day" id="_R_mm_" name="since" value=""/></div><p class="t-field-error" id="_R_mm_-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_7m_"><div class="t-field"><fieldset class="t-check-group" aria-labelledby="_R_1nm_"><legend class="t-check-group-label" id="_R_1nm_">Tags</legend><label class="t-check"><input class="t-check-input" aria-labelledby="_R_1lnm_-label" type="checkbox" name="tags" value="backup"/><span class="t-check-label" id="_R_1lnm_-label">backup</span></label><label class="t-check"><input class="t-check-input" aria-labelledby="_R_2lnm_-label" type="checkbox" name="tags" value="media"/><span class="t-check-label" id="_R_2lnm_-label">media</span></label><label class="t-check"><input class="t-check-input" aria-labelledby="_R_3lnm_-label" type="checkbox" name="tags" value="public"/><span class="t-check-label" id="_R_3lnm_-label">public</span></label></fieldset><p class="t-field-error" aria-live="polite"></p></div></div><div class="t-form-field" id="_R_8m_"><div class="t-field">
<!-- … cut here; the whole markup: reference/forms/form.html -->
```

<a id="key-value-editor"></a>

## Key-value editor (`key-value-editor`)

Edits pairs (environment variables, labels) as rows of a key and a value, with remove and Add. A key used twice is marked; a paste of KEY=value lines into a key fills one row per line; values of secret keys are hidden. The HTML kit upgrades a textarea of KEY=value lines.

- React: `import { KeyValueEditor } from "tailor/forms";`
- Classes: `t-kv-editor`; parts: `t-kv-editor-list` the list of rows; `t-kv-editor-row` one pair with its remove button; `t-kv-editor-key` the key input of a row; `t-kv-editor-value` the value input of a row, a secret field for a secret key; `t-kv-editor-error` the error text of a row
- HTML kit: script

Example: Environment variables

```tsx
<KeyValueEditor
  label="Environment"
  name="env"
  defaultValue={env}
  secretKeys={["PASSWORD", "TOKEN"]}
  keyPlaceholder="NAME"
  valuePlaceholder="value"
/>
```

```html
<textarea name="env" class="t-control t-textarea" data-t="key-value-editor" data-mono="" aria-label="Environment" data-key-placeholder="NAME" data-value-placeholder="value" data-secret-keys="PASSWORD TOKEN" rows="3">PORT=8080
HOST=web-1.example.com
DB_PASSWORD=correct-horse</textarea>
```

<a id="list-editor"></a>

## List editor (`list-editor`)

Edits a list of values (hosts, patterns, tags) as rows: a text input, or a select when the values are known, with move up, move down and remove buttons, and an Add button. The HTML kit upgrades a textarea with one value per line.

- React: `import { ListEditor } from "tailor/forms";`
- Classes: `t-list-editor`; parts: `t-list-editor-list` the list of rows; `t-list-editor-row` one value with its buttons; `t-list-editor-item` the control of one row; `t-list-editor-error` the error text of one row
- HTML kit: script

Example: Text rows

```tsx
<ListEditor
  label="Hosts"
  name="hosts"
  defaultValue={["web-1", "web-2", "nas"]}
  placeholder="Host name"
/>
```

```html
<textarea name="hosts" class="t-control t-textarea" data-t="list-editor" aria-label="Hosts" data-placeholder="Host name" rows="3">web-1
web-2
nas</textarea>
```

<a id="settings"></a>

## Settings (`settings`)

A settings page that saves by itself: sections in a side list that marks the section in view (a row of links in a narrow container), rows of Setting with a readable label, a description, an optional help and the control at the end. useAutoSave saves each change (text after a pause) and the row shows saving, saved or not saved with a retry. It fills its parent, a page body or a dialog, and scrolls its content itself. HTML kit: a row with data-t="setting" data-save-url="/api/settings" (data-save-method, default PATCH) sends each change as JSON {"name": "<the control's name>", "value": <the value: text, a number, true or false, or null for an empty number>} with Content-Type: application/json; the server answers 204 or 200 with {"ok": true}, or {"ok": false, "message": "…"} (or an error status), and the row then shows not saved, puts the old value back, toasts the message and offers retry. Each save fires t:save with {ok, message, name, value}. React kit: useAutoSave({ value, save }) calls save(value) and reads the same answer.

- React: `import { Settings, SettingsSection, useAutoSave, Setting } from "tailor/forms";`
- Classes: `t-settings`; parts: `t-settings-layout` the side list and the content side by side, or one above the other; `t-settings-nav` the list of section links; `t-settings-link` one section link; aria-current marks the section in view; `t-settings-content` the sections, which scroll; `t-settings-section` one section with its title; `t-settings-section-title` the title of a section; `t-settings-section-description` the line under the title of a section; `t-settings-section-body` the rows of a section; `t-setting` one setting row (its own root, from Setting); `t-setting-row` the grid of the label, the description, the help, the control and the state; `t-setting-help` the help button beside the label; `t-setting-state` the save state at the end of the row, a polite live region
- HTML kit: script

Example: A settings page

```tsx
<>
  <ToastRegion />
  <Settings sections={sections}>
    <Rows />
  </Settings>
</>
```

```html
<div class="t-settings" data-t="settings"><div class="t-settings-layout"><nav class="t-settings-nav" aria-label="Sections"><ul><li><a class="t-settings-link" href="#_R_2_-look" aria-current="true"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-palette"></use></svg><span>Look</span></a></li><li><a class="t-settings-link" href="#_R_2_-account"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-person"></use></svg><span>Account</span></a></li><li><a class="t-settings-link" href="#_R_2_-alerts"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-bell"></use></svg><span>Alerts</span></a></li></ul></nav><div class="t-settings-content"><section class="t-settings-section" id="_R_2_-look" aria-labelledby="_R_2_-look-title"><h2 class="t-settings-section-title" id="_R_2_-look-title" tabindex="-1">Look</h2><p class="t-settings-section-description">How the app looks on this device.</p><div class="t-settings-section-body"><div class="t-setting" data-t="setting" data-save-url="/api/settings/theme"><div class="t-setting-row"><div class="t-field"><label class="t-field-label" for="_R_2tm_" id="_R_2tm_-label">Theme</label><div class="t-field-control"><select class="t-control t-select" data-t="select" data-placeholder="Select…" id="_R_2tm_" name="theme" aria-describedby="_R_2tm_-help"><option value="" hidden="">Select…</option><option value="system" selected="">Same as the device</option><option value="dark">Dark</option><option value="light">Light</option></select></div><p class="t-field-help" id="_R_2tm_-help">Dark or light colours.</p><p class="t-field-error" id="_R_2tm_-error" aria-live="polite"></p></div><span class="t-setting-state" aria-live="polite"></span></div></div><div class="t-setting" data-t="setting" data-save-url="/api/settings/language"><div class="t-setting-row"><div class="t-field"><label class="t-field-label" for="_R_3dm_" id="_R_3dm_-label">Language</label><div class="t-field-control"><select class="t-control t-select" data-t="select" data-placeholder="Select…" id="_R_3dm_" name="language"><option value="" hidden="">Select…</option><option value="en" selected="">English</option><option value="de">Deutsch</option><option value="fr">Français</option></select></div><p class="t-field-error" id="_R_3dm_-error" aria-live="polite"></p></div><span class="t-setting-help"><button type="button" class="t-help" data-tone="info" aria-label="More information: Language" data-t="popover" data-t-popover="_R_5dm_"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-info"></use></svg></button><span class="t-popup t-popover" id="_R_5dm_" role="dialog" aria-label="More information: Language" hidden=""><button type="button" class="t-popover-close" aria-label="Close" data-t-close=""><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-close"></use></svg></button><span class="t-popover-body">Dates and numbers follow the language too.</span></span></span><span class="t-setting-state" aria-live="polite"></span></div></div><div class="t-setting" data-t="setting" data-save-url="/api/settings/compact" data-toggle=""><div class="t-setting-row"><div class="t-field"><label class="t-field-label" for="_R_3tm_" id="_R_3tm_-label">Compact lists</label><div class="t-field-control"><label class="t-switch"><input aria-describedby="_R_3tm_-help" class="t-switch-input" aria-labelledby="_R_1btm_-label" type="checkbox" role="switch" name="compact"/><span class="t-switch-label" id="_R_1btm_-label"><span class="t-sr-only">Compact lists</span></span></label></div><p class="t-field-help" id="_R_3tm_-help">Shows more rows on the screen.</p><p class="t-field-error" id="_R_3tm_-error" aria-live="polite"></p></div><span class="t-setting-state" aria-live="polite"></span></div></div></div></section><section class="t-settings-section" id="_R_2_-account" aria-labelledby="_R_2_-account-title">
<!-- … cut here; the whole markup: reference/forms/settings.html -->
```
