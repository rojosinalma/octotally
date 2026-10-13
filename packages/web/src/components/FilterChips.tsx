import { AlertIcon } from '@primer/octicons-react';
import { Button, Token } from '@primer/react';
import { useMemo } from 'react';
import { chipsFromQuery, removeToken } from '../lib/search';

interface Props {
  query: string;
  onChange: (query: string) => void;
}

/** Active filters below the search bar, each removable; unknown tokens are flagged. */
export function FilterChips({ query, onChange }: Props) {
  const chips = useMemo(() => chipsFromQuery(query), [query]);
  if (!chips.length) return null;
  const unknownCount = chips.filter((c) => c.kind === 'unknown').length;
  return (
    <fieldset className="filter-chips">
      <legend className="sr-only">Active filters</legend>
      {chips.map((chip) => (
        <Token
          key={chip.token}
          size="large"
          text={chip.label}
          leadingVisual={chip.kind === 'unknown' ? AlertIcon : undefined}
          className={
            chip.kind === 'unknown' ? 'chip-unknown' : chip.kind === 'text' ? 'chip-text' : undefined
          }
          title={chip.kind === 'unknown' ? `Unknown qualifier: ${chip.token}` : chip.token}
          onRemove={() => onChange(removeToken(query, chip.token))}
        />
      ))}
      {unknownCount > 0 && (
        <span className="chip-warning" role="status">
          {unknownCount === 1 ? '1 filter is not understood' : `${unknownCount} filters are not understood`}
        </span>
      )}
      <Button variant="invisible" size="small" onClick={() => onChange('')}>
        Clear
      </Button>
    </fieldset>
  );
}
