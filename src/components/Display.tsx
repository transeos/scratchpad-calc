import type { RefObject } from 'react';
import type { EvalResult } from '@/lib/exprtk';
import type { ModuleStatus } from '@/lib/types';
import { formatDiagnostic, formatNumber } from '@/lib/format';
import { CheckIcon, CloseIcon, CopyIcon, ShareIcon } from './Icons';

export type CopyTarget = 'expression' | 'result' | 'link';

interface DisplayProps {
  expression: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  evaluation: EvalResult | null;
  status: ModuleStatus;
  copied: CopyTarget | null;
  onCopy: (target: CopyTarget, text: string) => void;
  onShare: () => void;
}

export default function Display({
  expression,
  onChange,
  onSubmit,
  onClear,
  inputRef,
  evaluation,
  status,
  copied,
  onCopy,
  onShare
}: DisplayProps) {
  const hasResult = evaluation?.ok === true;
  const resultText = hasResult ? formatNumber(evaluation.value) : '';

  return (
    <div className="display">
      <div className="expr-row">
        <input
          ref={inputRef}
          className="expr-input"
          value={expression}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Expression"
          placeholder="Enter expression..."
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          type="button"
          className="icon-btn"
          title="Copy expression"
          aria-label="Copy expression"
          disabled={expression.length === 0}
          onClick={() => onCopy('expression', expression)}
        >
          {copied === 'expression' ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button
          type="button"
          className="icon-btn warm"
          title="Clear expression"
          aria-label="Clear expression"
          disabled={expression.length === 0}
          onClick={onClear}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="result-row">
        <div className="result" aria-live="polite">
          {renderResult()}
        </div>

        <div className="display-actions">
          <button
            type="button"
            className={`icon-btn${copied === 'result' ? ' done' : ''}`}
            title="Copy result"
            aria-label="Copy result"
            disabled={!hasResult}
            onClick={() => onCopy('result', resultText)}
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            className={`icon-btn${copied === 'link' ? ' done' : ''}`}
            title="Copy a link to this expression"
            aria-label="Copy a link to this expression"
            disabled={expression.trim().length === 0}
            onClick={onShare}
          >
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );

  function renderResult() {
    if (status === 'loading') {
      return <span className="result-idle">Loading ExprTk...</span>;
    }

    if (status === 'failed') {
      return <span className="result-error">The ExprTk WebAssembly module failed to load.</span>;
    }

    if (expression.trim().length === 0) {
      return <span className="result-idle">Ready</span>;
    }

    if (!evaluation) {
      return <span className="result-idle">Ready</span>;
    }

    if (!evaluation.ok) {
      return (
        <span className="result-error">
          {formatDiagnostic(evaluation.error)}
          {evaluation.position >= 0 && <> {' '}<code>at position {evaluation.position + 1}</code></>}
        </span>
      );
    }

    return (
      <>
        <span className="result-eq">=</span>
        {resultText}
      </>
    );
  }
}
