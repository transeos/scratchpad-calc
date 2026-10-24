import { formatNumber, formatRelativeTime } from '@/lib/format';
import type { HistoryEntry } from '@/lib/types';
import { ReuseIcon, TrashIcon } from './Icons';

interface HistoryProps {
  entries: HistoryEntry[];
  onReuse: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function History({ entries, onReuse, onRemove, onClear }: HistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="empty">
        Nothing here yet. Press Enter or <b>=</b> to evaluate an expression and keep it.
      </p>
    );
  }

  return (
    <div>
      <div className="panel-head">
        <p className="panel-hint">
          {entries.length} saved {entries.length === 1 ? 'calculation' : 'calculations'}.
        </p>
        <button type="button" className="btn" onClick={onClear}>
          Clear all
        </button>
      </div>

      <div className="list">
        <div className="list-head history-grid">
          <span>Expression</span>
          <span>Result</span>
          <span className="cell-time">When</span>
          <span />
        </div>
        <div className="scroll-area">
          {entries.map((entry) => (
            <div className="list-row history-grid" key={entry.id}>
              <span className="cell-mono" title={entry.expression}>
                {entry.expression}
              </span>
              <span className="cell-mono cell-value" title={String(entry.value)}>
                {formatNumber(entry.value)}
              </span>
              <span className="cell-time">{formatRelativeTime(entry.at)}</span>
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
    </div>
  );
}
