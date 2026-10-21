import { Ui } from 'tailor-react';

const SHORTCUTS: [string, string][] = [
  ['j / k', 'Move selection down / up'],
  ['o / Enter', 'Open selected item on GitHub'],
  ['x', 'Open the details panel for the selected item'],
  ['e', 'Mark selected item done'],
  ['m', 'Mute selected item'],
  ['u', 'Restore a muted or done item'],
  ['/', 'Focus the search bar'],
  ['r', 'Refresh from GitHub'],
  ['?', 'Show this help'],
  ['Esc', 'Close panel or dialog'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Ui.Dialog id="shortcuts" open={open} title="Keyboard shortcuts" onClose={onClose}>
      <dl className="shortcuts">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={keys} className="shortcut-row">
            <dt>
              {keys.split(' / ').map((k, i) => (
                <span key={k}>
                  {i > 0 && <span className="t-muted t-small"> or </span>}
                  <kbd>{k}</kbd>
                </span>
              ))}
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </Ui.Dialog>
  );
}
