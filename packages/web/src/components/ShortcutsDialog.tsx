import { Ui } from 'tailor-react';

const SHORTCUTS: [string, string][] = [
  ['j / k', 'Move selection down / up'],
  ['o / Enter', 'Open selected item on GitHub'],
  ['x', 'Open the details panel for the selected item'],
  ['s', 'Select or unselect the item (Shift+S: range)'],
  ['Shift+A', 'Select all items / unselect all'],
  ['e', 'Mark done (selected items, else the current one)'],
  ['m', 'Mute (selected items, else the current one)'],
  ['u', 'Restore (selected items, else the current one)'],
  ['/', 'Focus the search bar'],
  ['r', 'Refresh from GitHub'],
  ['?', 'Show this help'],
  ['Esc', 'Close panel or dialog, else clear the selection'],
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
