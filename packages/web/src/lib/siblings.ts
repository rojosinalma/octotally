import type { SiblingsView } from '@octotally/shared';

export interface SwitcherEntry {
  key: string;
  title: string;
  url: string;
  icon: string | null;
  /** This app. */
  current: boolean;
}

/** Menu rows for the member switcher: every member once, in Octoforge's order, this app marked. */
export function switcherMembers(view: SiblingsView): SwitcherEntry[] {
  const seen = new Set<string>();
  const out: SwitcherEntry[] = [];
  for (const m of view.members) {
    if (seen.has(m.name)) continue;
    seen.add(m.name);
    out.push({
      key: m.name,
      title: m.title,
      url: m.url,
      icon: m.icon ?? null,
      current: m.name === view.self,
    });
  }
  return out;
}
