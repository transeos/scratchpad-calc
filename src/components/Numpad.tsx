import type { InsertFn } from '@/lib/types';

interface NumpadProps {
  onInsert: InsertFn;
  onBackspace: () => void;
}

interface Key {
  label: string;
  token: string;
  /** Caret offset within the token; defaults to its length. */
  caret?: number;
  variant?: 'op' | 'fn' | 'warm';
  title?: string;
}

/**
 * Four columns, mirroring the layout of a pocket scientific calculator. There is no
 * = key: results update as you type.
 */
const KEYS: (Key | 'backspace')[] = [
  { label: '1/x', token: '1/()', caret: 3, variant: 'fn', title: 'Reciprocal' },
  { label: 'x²', token: '^2', variant: 'fn', title: 'Square' },
  { label: '√x', token: 'sqrt()', caret: 5, variant: 'fn', title: 'Square root' },
  'backspace',

  { label: '(', token: '(', variant: 'fn' },
  { label: ')', token: ')', variant: 'fn' },
  { label: '^', token: '^', variant: 'op', title: 'Power' },
  { label: '÷', token: ' / ', variant: 'op', title: 'Divide' },

  { label: '7', token: '7' },
  { label: '8', token: '8' },
  { label: '9', token: '9' },
  { label: '×', token: ' * ', variant: 'op', title: 'Multiply' },

  { label: '4', token: '4' },
  { label: '5', token: '5' },
  { label: '6', token: '6' },
  { label: '−', token: ' - ', variant: 'op', title: 'Subtract' },

  { label: '1', token: '1' },
  { label: '2', token: '2' },
  { label: '3', token: '3' },
  { label: '+', token: ' + ', variant: 'op', title: 'Add' },

  { label: 'π', token: 'pi', variant: 'fn', title: 'Pi' },
  { label: '0', token: '0' },
  { label: '.', token: '.' },
  { label: 'x°', token: 'deg2rad()', caret: 8, variant: 'fn', title: 'Degrees to radians (deg2rad)' }
];

export default function Numpad({ onInsert, onBackspace }: NumpadProps) {
  return (
    <div className="keypad">
      {KEYS.map((key, index) => {
        if (key === 'backspace') {
          return (
            <button
              key="backspace"
              type="button"
              className="key warm"
              title="Delete the character before the caret"
              aria-label="Backspace"
              onClick={onBackspace}
            >
              &#9003;
            </button>
          );
        }

        return (
          <button
            key={`${key.label}-${index}`}
            type="button"
            className={`key${key.variant ? ` ${key.variant}` : ''}`}
            title={key.title ?? key.label}
            onClick={() => onInsert(key.token, key.caret ?? key.token.length)}
          >
            {key.label}
          </button>
        );
      })}
    </div>
  );
}
