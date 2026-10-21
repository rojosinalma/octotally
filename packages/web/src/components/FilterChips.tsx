import { useMemo } from 'react';
import { Ui } from 'tailor-react';
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
      <legend className="t-visually-hidden">Active filters</legend>
      <Ui.Cluster gap="2" align="center">
        {chips.map((chip) => (
          <Ui.Chip
            key={chip.token}
            tone={chip.kind === 'unknown' ? 'danger' : undefined}
            className={chip.kind === 'text' ? 'chip-text' : undefined}
            data-tip={chip.kind === 'unknown' ? `Unknown qualifier: ${chip.token}` : chip.token}
            onRemove={() => onChange(removeToken(query, chip.token))}
            removeLabel={`Remove filter ${chip.label}`}
          >
            {chip.kind === 'unknown' && <Ui.Icon name="bi-exclamation-triangle" />}
            {chip.label}
          </Ui.Chip>
        ))}
        {unknownCount > 0 && (
          <span className="t-small t-tone-text" data-tone="danger" role="status">
            {unknownCount === 1 ? '1 filter is not understood' : `${unknownCount} filters are not understood`}
          </span>
        )}
        <Ui.Button variant="ghost" size="xs" onClick={() => onChange('')}>
          Clear
        </Ui.Button>
      </Ui.Cluster>
    </fieldset>
  );
}
