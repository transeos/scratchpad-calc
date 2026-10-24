import { formatDateTime, formatNumber, formatRelativeTime } from '@/lib/format';
import type { HistoryEntry } from '@/lib/types';
import { BookmarkIcon, ReuseIcon, TrashIcon } from './Icons';

interface HistoryProps {
  entries: HistoryEntry[];
  /** Whether there is a current expression to add. */
  canAdd: boolean;
  onAdd: () => void;
  onReuse: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function History({ entries, canAdd, onAdd, onReuse, onRemove, onClear }: HistoryProps) {
  return (
    <div>
      <div className="panel-head">
        <p className="panel-hint">
          {entries.length === 0
            ? 'Valid expressions are saved here as you type.'
            : `${entries.length} saved ${entries.length === 1 ? 'calculation' : 'calculations'}.`}
        </p>
        <div className="panel-actions">
          <button
            type="button"
            className="btn"
            title="Add the current expression; it is kept until you delete it"
            disabled={!canAdd}
            onClick={onAdd}
          >
            Add current
          </button>
          {entries.length > 0 && (
            <button type="button" className="btn" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="empty">Nothing here yet. Type a valid expression and it will appear here.</p>
      ) : (
        <div className="list">
          <div className="list-head history-grid">
            <span>Expression</span>
            <span>Result</span>
            <span className="cell-time">Date &amp; time</span>
            <span />
          </div>
          <div className="scroll-area">
            {entries.map((entry) => (
              <div className="list-row history-grid" key={entry.id}>
                <span className="cell-mono" title={entry.expression}>
                  {entry.manual && (
                    <span className="entry-mark" title="Added manually; kept until you delete it">
                      <BookmarkIcon size={13} />
                    </span>
                  )}
                  {entry.expression}
                </span>
                {entry.value === null ? (
                  <span className="cell-mono cell-invalid" title="Not a valid expression">
                    —
                  </span>
                ) : (
                  <span className="cell-mono cell-value" title={String(entry.value)}>
                    {formatNumber(entry.value)}
                  </span>
                )}
                <span className="cell-time" title={formatRelativeTime(entry.at)}>
                  {formatDateTime(entry.at)}
                </span>
                <span className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Load this expression"
                    aria-label="Load this expression"
                    onClick={() => onReuse(entry)}
                  >
                    <ReuseIcon />
                  </button>
                  <button
                    type="button"
                    className="icon-btn warm"
                    title="Delete"
                    aria-label="Delete"
                    onClick={() => onRemove(entry.id)}
                  >
                    <TrashIcon />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="panel-note">History stays on this device.</p>
    </div>
  );
}
