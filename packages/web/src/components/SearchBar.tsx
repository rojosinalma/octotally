import {
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Ui } from 'tailor-react';
import { applySuggestion, type SuggestContext, suggest } from '../lib/search';

export interface SearchBarHandle {
  focus: () => void;
}

interface Props {
  /** Committed query (single source of truth). */
  value: string;
  onSubmit: (query: string) => void;
  context: SuggestContext;
}

export const SearchBar = forwardRef<SearchBarHandle, Props>(function SearchBar(
  { value, onSubmit, context },
  ref,
) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => setDraft(value), [value]);
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  const suggestions = useMemo(() => (open ? suggest(draft, context) : null), [draft, context, open]);
  const items = suggestions?.items ?? [];

  const accept = useCallback(
    (index: number) => {
      if (!suggestions) return;
      const s = suggestions.items[index];
      if (!s) return;
      setDraft(applySuggestion(draft, suggestions.partial, s.insert));
      inputRef.current?.focus();
    },
    [draft, suggestions],
  );

  const submit = useCallback(() => {
    setOpen(false);
    onSubmit(draft.trim());
    inputRef.current?.blur();
  }, [draft, onSubmit]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Tab' && open && items.length) {
      e.preventDefault();
      accept(active < 0 ? 0 : active);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && items[active]) accept(active);
      else submit();
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <div className="searchbar">
      <Ui.InputGroup className="searchbar-group">
        <Ui.InputAddon>
          <Ui.Icon name="bi-search" />
        </Ui.InputAddon>
        <Ui.Input
          ref={inputRef}
          aria-label="Search items"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Search or filter, e.g. is:open type:pr repo:owner/name label:bug"
          value={draft}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {draft && (
          <Ui.Button
            variant="ghost"
            iconOnly
            aria-label="Clear search"
            tip="Clear search"
            onClick={() => {
              setDraft('');
              onSubmit('');
              inputRef.current?.focus();
            }}
          >
            <Ui.Icon name="bi-x-lg" />
          </Ui.Button>
        )}
      </Ui.InputGroup>
      {open && items.length > 0 && (
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: tailor's listbox markup (ul.t-menu-list[role=listbox]), as the drawn select uses it.
        <ul className="t-menu-list searchbar-menu" id={listId} role="listbox" aria-label="Search suggestions">
          {items.map((s, i) => (
            <li key={s.insert}>
              <button
                type="button"
                className="t-menu-item"
                role="option"
                id={`${listId}-${i}`}
                tabIndex={-1}
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(i)}
                onMouseEnter={() => setActive(i)}
              >
                <code className="searchbar-suggestion">{s.label}</code>
                {s.description && <Ui.Menu.Desc>{s.description}</Ui.Menu.Desc>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
