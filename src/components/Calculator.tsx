import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Display, { type CopyTarget } from './Display';
import Functions from './Functions';
import History from './History';
import Numpad from './Numpad';
import Variables from './Variables';
import { loadExprtk, type EvalResult, type ExprtkModule } from '@/lib/exprtk';
import { isReservedName } from '@/lib/format';
import type { HistoryEntry, ModuleStatus, VariableMap } from '@/lib/types';

const STORAGE_KEY = 'calculator.v2';
const MAX_HISTORY = 100;

type TabId = 'numpad' | 'functions' | 'variables' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'numpad', label: 'Numpad' },
  { id: 'functions', label: 'Functions' },
  { id: 'variables', label: 'Variables' },
  { id: 'history', label: 'History' }
];

interface PersistedState {
  variables?: unknown;
  history?: unknown;
}

interface CalculatorProps {
  /** Seeded from ?expr=<expression> share links. */
  initialExpression?: string;
}

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `${Date.now().toString(36)}-${sequence}`;
}

function readStored(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PersistedState) : {};
  } catch {
    return {};
  }
}

function sanitiseVariables(input: unknown): VariableMap {
  const out: VariableMap = {};
  if (!input || typeof input !== 'object') return out;

  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[name] = value;
    }
  }

  return out;
}

function sanitiseHistory(input: unknown): HistoryEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((entry): entry is HistoryEntry => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<HistoryEntry>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.expression === 'string' &&
        typeof candidate.value === 'number' &&
        typeof candidate.at === 'number'
      );
    })
    .slice(0, MAX_HISTORY);
}

export default function Calculator({ initialExpression = '' }: CalculatorProps) {
  const [expression, setExpression] = useState(initialExpression);
  const [variables, setVariables] = useState<VariableMap>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tab, setTab] = useState<TabId>('numpad');
  const [status, setStatus] = useState<ModuleStatus>('loading');
  const [exprtk, setExprtk] = useState<ExprtkModule | null>(null);
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadExprtk()
      .then((module) => {
        if (cancelled) return;
        setExprtk(module);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load the ExprTk WebAssembly module', error);
        setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Restoring after mount keeps the server and client markup identical.
  useEffect(() => {
    const stored = readStored();
    setVariables(sanitiseVariables(stored.variables));
    setHistory(sanitiseHistory(stored.history));
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ variables, history }));
    } catch {
      // Storage can be full or blocked; the calculator still works without it.
    }
  }, [restored, variables, history]);

  // Keypad and chip insertions place the caret themselves.
  useEffect(() => {
    if (caret === null) return;

    const input = inputRef.current;
    if (input) {
      input.focus();
      input.setSelectionRange(caret, caret);
    }

    setCaret(null);
  }, [caret]);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const evaluation = useMemo<EvalResult | null>(() => {
    if (!exprtk || expression.trim() === '') return null;

    try {
      return exprtk.evaluate(expression, variables);
    } catch (error) {
      return { ok: false, value: 0, error: String(error), position: -1 };
    }
  }, [exprtk, expression, variables]);

  const missing = useMemo(() => {
    if (!exprtk || expression.trim() === '') return [];

    try {
      return exprtk
        .collectVariables(expression)
        .filter((name) => !(name in variables) && !isReservedName(name));
    } catch {
      return [];
    }
  }, [exprtk, expression, variables]);

  const insert = useCallback(
    (token: string, caretOffset: number) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? expression.length;
      const end = input?.selectionEnd ?? expression.length;

      setExpression(expression.slice(0, start) + token + expression.slice(end));
      setCaret(start + caretOffset);
    },
    [expression]
  );

  const backspace = useCallback(() => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? expression.length;
    const end = input?.selectionEnd ?? expression.length;

    if (start !== end) {
      setExpression(expression.slice(0, start) + expression.slice(end));
      setCaret(start);
      return;
    }

    if (start === 0) return;

    setExpression(expression.slice(0, start - 1) + expression.slice(start));
    setCaret(start - 1);
  }, [expression]);

  const commit = useCallback(() => {
    if (!evaluation?.ok) return;

    const trimmed = expression.trim();
    const entry: HistoryEntry = {
      id: nextId(),
      expression: trimmed,
      value: evaluation.value,
      at: Date.now()
    };

    setHistory((previous) =>
      [entry, ...previous.filter((item) => item.expression !== trimmed)].slice(0, MAX_HISTORY)
    );
  }, [evaluation, expression]);

  const copy = useCallback(async (target: CopyTarget, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
    } catch {
      // Clipboard access needs a secure context and user permission.
    }
  }, []);

  const share = useCallback(() => {
    const trimmed = expression.trim();
    if (trimmed === '') return;

    // Keep the current path so links still work when the site lives under a prefix.
    const link = new URL(window.location.pathname, window.location.origin);
    link.searchParams.set('expr', trimmed);

    void copy('link', link.href);
  }, [copy, expression]);

  const setVariable = useCallback((name: string, value: number) => {
    setVariables((previous) => ({ ...previous, [name]: value }));
  }, []);

  const removeVariable = useCallback((name: string) => {
    setVariables((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }, []);

  const reuse = useCallback((entry: HistoryEntry) => {
    setExpression(entry.expression);
    setCaret(entry.expression.length);
  }, []);

  const counts: Partial<Record<TabId, number>> = {
    variables: Object.keys(variables).length,
    history: history.length
  };

  return (
    <main className="page">
      <header className="header">
        <h1 className="brand-title">Scratchpad Calculator</h1>
      </header>

      <div className="card">
        <Display
          expression={expression}
          onChange={setExpression}
          onSubmit={commit}
          onClear={() => {
            setExpression('');
            setCaret(0);
          }}
          inputRef={inputRef}
          evaluation={evaluation}
          status={status}
          copied={copied}
          onCopy={(target, text) => void copy(target, text)}
          onShare={share}
        />

        <div className="tabs" role="tablist" aria-label="Calculator panels">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              className="tab"
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {counts[item.id] ? <span className="tab-count">{counts[item.id]}</span> : null}
            </button>
          ))}
        </div>

        <div className="panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'numpad' && (
            <Numpad
              onInsert={insert}
              onBackspace={backspace}
              onSubmit={commit}
              canSubmit={evaluation?.ok === true}
            />
          )}

          {tab === 'functions' && <Functions onInsert={insert} />}

          {tab === 'variables' && (
            <Variables
              variables={variables}
              missing={missing}
              onSet={setVariable}
              onRemove={removeVariable}
              onInsert={insert}
            />
          )}

          {tab === 'history' && (
            <History
              entries={history}
              onReuse={reuse}
              onRemove={(id) => setHistory((previous) => previous.filter((item) => item.id !== id))}
              onClear={() => setHistory([])}
            />
          )}
        </div>
      </div>

      <p className="footer">
        Powered by{' '}
        <a href="https://www.partow.net/programming/exprtk/" target="_blank" rel="noreferrer">
          ExprTk
        </a>{' '}
        running in your browser. Variables and history stay on this device.
      </p>
    </main>
  );
}
