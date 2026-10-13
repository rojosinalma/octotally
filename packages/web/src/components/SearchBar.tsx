import { SearchIcon, XIcon } from '@primer/octicons-react';
import { ActionList, TextInput } from '@primer/react';
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
      <TextInput
        ref={inputRef}
        block
        size="medium"
        leadingVisual={SearchIcon}
        aria-label="Search items"
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
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
        trailingAction={
          draft ? (
            <TextInput.Action
              onClick={() => {
                setDraft('');
                onSubmit('');
                inputRef.current?.focus();
              }}
              icon={XIcon}
              aria-label="Clear search"
            />
          ) : undefined
        }
      />
      {open && items.length > 0 && (
        <div className="searchbar-menu">
          <ActionList id={listId} role="listbox" aria-label="Search suggestions" showDividers={false}>
            {items.map((s, i) => (
              <ActionList.Item
                key={s.insert}
                role="option"
                active={i === active}
                aria-selected={i === active}
                onSelect={() => accept(i)}
                onMouseEnter={() => setActive(i)}
              >
                <code className="searchbar-suggestion">{s.label}</code>
                {s.description && (
                  <ActionList.Description variant="block">{s.description}</ActionList.Description>
                )}
              </ActionList.Item>
            ))}
          </ActionList>
        </div>
      )}
    </div>
  );
});
