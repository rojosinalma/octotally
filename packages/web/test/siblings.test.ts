import { describe, expect, test } from 'bun:test';
import type { SiblingsView } from '@octotally/shared';
import { switcherMembers } from '../src/lib/siblings';

const view = (members: SiblingsView['members'], self = 'octotally'): SiblingsView => ({
  forge: { title: 'Octoforge', url: 'https://forge.example.com' },
  members,
  updated_at: '2026-10-21T12:00:00Z',
  received_at: '2026-10-21T12:00:01Z',
  self,
});

describe('switcherMembers', () => {
  test('keeps Octoforge order, marks this app, fills a missing icon with null', () => {
    const rows = switcherMembers(
      view([
        { name: 'octowarden', title: 'Octowarden', url: 'https://warden.example.com' },
        {
          name: 'octotally',
          title: 'Octotally',
          url: 'https://tally.example.com',
          icon: 'https://tally.example.com/favicon.svg',
        },
      ]),
    );
    expect(rows).toEqual([
      {
        key: 'octowarden',
        title: 'Octowarden',
        url: 'https://warden.example.com',
        icon: null,
        current: false,
      },
      {
        key: 'octotally',
        title: 'Octotally',
        url: 'https://tally.example.com',
        icon: 'https://tally.example.com/favicon.svg',
        current: true,
      },
    ]);
  });

  test('one row per member name; nothing marked when this app is not listed', () => {
    const rows = switcherMembers(
      view([
        { name: 'octowarden', title: 'Octowarden', url: 'https://a.example.com' },
        { name: 'octowarden', title: 'Octowarden 2', url: 'https://b.example.com' },
      ]),
    );
    expect(rows.map((r) => r.url)).toEqual(['https://a.example.com']);
    expect(rows.some((r) => r.current)).toBe(false);
  });
});
