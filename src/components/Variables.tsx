import { useState } from 'react';
import {
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  isReservedName,
  isValidVariableName
} from '@/lib/format';
import type { InsertFn, VariableEntries } from '@/lib/types';
import { TrashIcon } from './Icons';

interface VariablesProps {
  variables: VariableEntries;
  missing: string[];
  onSet: (name: string, value: number) => void;
  onRemove: (name: string) => void;
  onInsert: InsertFn;
}

export default function Variables({ variables, missing, onSet, onRemove, onInsert }: VariablesProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const names = Object.keys(variables).sort((a, b) => a.localeCompare(b));

  function submit() {
    const trimmedName = name.trim();
    const trimmedValue = value.trim();

    if (!isValidVariableName(trimmedName)) {
      setError('A name must start with a letter or underscore and contain only letters, digits or underscores.');
      return;
    }

    if (isReservedName(trimmedName)) {
      setError(`"${trimmedName}" is reserved by ExprTk and cannot be redefined.`);
      return;
    }

    const parsed = Number(trimmedValue);

    if (trimmedValue === '' || !Number.isFinite(parsed)) {
      setError('The value must be a finite number.');
      return;
    }

    onSet(trimmedName, parsed);
    setName('');
    setValue('');
    setError(null);
  }

  return (
    <div>
      {missing.length > 0 && (
        <p className="notice">
          The expression uses {missing.length === 1 ? 'a variable' : 'variables'} with no value yet:{' '}
          {missing.map((item, index) => (
            <span key={item}>
              {index > 0 && ', '}
              <code>{item}</code>
            </span>
          ))}
          .
        </p>
      )}

      <div className="form-row">
        <label className="field">
          <span className="field-label">Variable</span>
          <input
            className="input"
            value={name}
            placeholder="x"
            spellCheck={false}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
        </label>
        <label className="field">
          <span className="field-label">Value</span>
          <input
            className="input"
            value={value}
            placeholder="1.5"
            inputMode="decimal"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Add / update
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {names.length === 0 ? (
        <p className="empty">No variables yet. Define one above, then use it in an expression.</p>
      ) : (
        <div className="list">
          <div className="list-head vars-grid">
            <span>Variable</span>
            <span>Value</span>
            <span className="cell-time">Date &amp; time</span>
            <span />
          </div>
          <div className="scroll-area">
            {names.map((item) => {
              const { value, at } = variables[item];

              return (
                <div className="list-row vars-grid" key={item}>
                  <button
                    type="button"
                    className="chip"
                    title={`Insert ${item} into the expression`}
                    onClick={() => onInsert(item, item.length)}
                  >
                    {item}
                  </button>
                  <span className="cell-mono cell-value">{formatNumber(value)}</span>
                  <span className="cell-time" title={formatRelativeTime(at)}>
                    {formatDateTime(at)}
                  </span>
                  <button
                    type="button"
                    className="icon-btn warm"
                    title={`Delete ${item}`}
                    aria-label={`Delete ${item}`}
                    onClick={() => onRemove(item)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="panel-note">Variables stay on this device.</p>
    </div>
  );
}
