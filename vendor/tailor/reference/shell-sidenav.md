# tailor 2.3.1: pack shell-sidenav (Side navigation shell)

Grouped links in a left column that collapses.

Requires: core. Libraries (React kit): none. HTML kit: full.

SVG drawing data in the markup shows as `d="…"`, inline images as `data:…`, and markup over 4000 characters is cut. The HTML kit has each example whole in `reference/shell-sidenav/<component>.html`.

<a id="sidenav"></a>

## Side navigation shell (`sidenav`)

A frame with a left column: the brand, the global actions, the grouped links (sections open in place) and, at the bottom, the footer facts and the theme controls. The column collapses to icons with tooltips; the state is remembered; on a tablet it starts collapsed unless tabletCollapsed is false. The search sits under the brand; on a phone an icon button in the top bar opens it as a row under the bar. The Page header is the top bar of the content. On a phone a top bar opens the navigation drawer, or a bottom bar shows. Content: one Page. HTML kit: the markup holds each link once, in the column's groups; the script builds the phone's navigation drawer (the brand, the groups with their sections open, the footer facts and theme controls) from them. Markup that already holds a drawer keeps it; the bottom bar form (phoneNav="bar") writes its drawer.

- React: `import { SideNavShell } from "tailor/shell-sidenav";`
- Classes: `t-shell`; parts: `t-shell-collapse` the toggle at the top of the column that collapses it to icons
- Props: `brand`: text or content; `nav`: text or content; `search`: text or content; `actions`: text or content; `footer`: text or content; `theme`: skin | palette | mode; `phoneNav`: drawer | bar; `storageKey`: text or content; `tabletCollapsed`: text or content; `contained`: text or content
- HTML kit: script

Example: Groups, a section, actions, footer facts and theme controls in the column

```tsx
<SideNavShell
  brand={BRAND}
  nav={GROUPS}
  search={SEARCH}
  actions={ACTIONS}
  footer={FOOTER}
  theme={["palette", "mode"]}
  storageKey="example.sidenav.default"
>
  <ServicesPage />
</SideNavShell>
```

```html
<div class="t-shell" data-shell="sidenav" data-t="shell"><a class="t-shell-skip" href="#_R_0_">Skip to content</a><div class="t-shell-sidebar" data-t="sidenav" data-storage-key="example.sidenav.default"><header class="t-shell-bar"><a href="#overview" class="t-shell-brand"><span class="t-shell-brand-mark"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-box-seam"></use></svg></span><span class="t-shell-brand-name">Console</span></a><a class="t-btn t-shell-search-button" data-variant="ghost" data-icon-only="" href="#_R_0H2_" aria-label="Search" aria-controls="_R_0H2_" aria-expanded="false"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></a><button type="button" class="t-btn t-shell-collapse" data-variant="ghost" data-icon-only="" aria-label="Collapse sidebar" aria-expanded="true" data-t="tooltip" data-tip="Collapse sidebar"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-sidebar"></use></svg></button></header><div class="t-shell-search" id="_R_0H2_" role="search"><div class="t-control t-input-group t-search" data-t="search" data-size="sm" data-shortcut="off"><span class="t-input-addon t-search-icon"><svg class="t-icon" viewBox="0 0 16 16" aria-hidden="true"><use href="/tailor/icons.svg#t-search"></use></svg></span><input type="search" class="t-input-native" placeholder="Search" aria-label="Search the console" autoComplete="off" value=""/></div></div><div class="t-shell-actions"><button type="button" class="t-btn" data-variant="ghost" data-icon-only="" aria-label="alice" data-t="menu" data-t-menu="_R_3d_" aria-haspopup="menu" aria-expanded="false"><span class="t-avatar" role="img" aria-label="alice" data-size="sm"><span class="t-avatar-initials" aria-hidden="true">A</span></span></button><div class="t-popup t-menu" id="_R_3d_" role="menu" aria-label="alice" data-align="end" hidden=""><a href="#profile" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="profile"><span class="t-menu-label">Profile</span></a><a href="#keys" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="keys"><span class="t-menu-label">Access keys</span></a><div class="t-menu-separator" role="separator" aria-orientation="horizontal"></div><button type="button" class="t-option t-menu-item" role="menuitem" tabindex="-1" data-id="sign-out"><span class="t-menu-label">Sign out</span></button></div></div><nav class="t-shell-nav" aria-label="Main navigation"><div class="t-shell-group"><div class="t-shell-group-label">Run</div><ul class="t-shell-list" aria-label="Run"><li><a href="#overview" class="t-shell-link" data-t="tooltip" data-tip-side="end"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-speedometer2"></use></svg></span><span class="t-shell-label">Overview</span></a></li><li><a href="#services" aria-current="page" class="t-shell-link" data-t="tooltip" data-tip-side="end"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-hdd-stack"></use></svg></span><span class="t-shell-label">Services</span><span class="t-counter" data-tone="neutral">3</span></a></li><li><a href="#hosts" class="t-shell-link" data-t="tooltip" data-tip-side="end"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-pc-display"></use></svg></span><span class="t-shell-label">Hosts</span></a></li><li><a href="#deploys" class="t-shell-link" data-t="tooltip" data-tip-side="end"><span class="t-shell-icon"><svg class="t-icon" aria-hidden="true"><use href="/tailor/icons.svg#bi-rocket-takeoff"></use></svg></span><span class="t-shell-label">Deploys</span></a></li></ul></div><div class="t-shell-group"><div class="t-shell-group-label">Admin</div><ul class="t-shell-list" aria-label="Admin"><li><button type="button" class="t-shell-link" aria-expanded="false" aria-controls="_R_4d_-system" data-id="system">
<!-- … cut here; the whole markup: reference/shell-sidenav/sidenav.html -->
```
