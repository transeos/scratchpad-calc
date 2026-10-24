import { useMemo, useState } from 'react';
import { CONSTANTS, FUNCTION_GROUPS, OPERATORS, type FunctionGroup } from '@/lib/catalogue';
import type { InsertFn } from '@/lib/types';

interface FunctionsProps {
  onInsert: InsertFn;
}

const ALL_GROUPS: FunctionGroup[] = [
  { name: 'Operators', entries: OPERATORS },
  { name: 'Constants', entries: CONSTANTS },
  ...FUNCTION_GROUPS
];

export default function Functions({ onInsert }: FunctionsProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return ALL_GROUPS;

    return ALL_GROUPS.map((group) => ({
      name: group.name,
      entries: group.entries.filter(
        (entry) =>
          entry.label.toLowerCase().includes(needle) ||
          entry.hint.toLowerCase().includes(needle)
      )
    })).filter((group) => group.entries.length > 0);
  }, [query]);

  return (
    <div>
      <input
        className="search"
        type="search"
        value={query}
        placeholder="Search functions and operators..."
        aria-label="Search functions and operators"
        onChange={(event) => setQuery(event.target.value)}
      />

      {groups.length === 0 ? (
        <p className="empty">Nothing matches “{query}”.</p>
      ) : (
        groups.map((group) => (
          <section className="group" key={group.name}>
            <h3 className="group-title">{group.name}</h3>
            <div className="chips">
              {group.entries.map((entry) => (
                <button
                  key={`${group.name}-${entry.label}`}
                  type="button"
                  className={`chip${group.name === 'Operators' ? ' op' : ''}`}
                  title={entry.hint}
                  onClick={() => onInsert(entry.token, entry.caret)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
