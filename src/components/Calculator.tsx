import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Display, { type CopyTarget } from './Display';
import Functions from './Functions';
import History from './History';
import Numpad from './Numpad';
import Variables from './Variables';
import { loadExprtk, type EvalResult, type ExprtkModule } from '@/lib/exprtk';
import { isReservedName } from '@/lib/format';
import { loadState, saveState } from '@/lib/storage';
import type {
  HistoryEntry,
  ModuleStatus,
  VariableEntries,
  VariableEntry,
  VariableMap
} from '@/lib/types';

const MAX_HISTORY = 10_000;

type TabId = 'numpad' | 'functions' | 'variables' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'numpad', label: 'Numpad' },
  { id: 'functions', label: 'Functions' },
  { id: 'variables', label: 'Variables' },
  { id: 'history', label: 'History' }
];

interface CalculatorProps {
  /** Seeded from ?expr=<expression> share links. */
  initialExpression?: string;
}

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `${Date.now().toString(36)}-${sequence}`;
}

function sanitiseVariables(input: unknown): VariableEntries {
  const out: VariableEntries = {};
  if (!input || typeof input !== 'object') return out;

  // Earlier builds saved bare numbers with no time; they are stamped on first load.
  const now = Date.now();

  for (const [name, stored] of Object.entries(input as Record<string, unknown>)) {
    if (typeof stored === 'number' && Number.isFinite(stored)) {
      out[name] = { value: stored, at: now };
      continue;
    }

    if (!stored || typeof stored !== 'object') continue;
    const { value, at } = stored as Partial<Record<keyof VariableEntry, unknown>>;
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[name] = { value, at: typeof at === 'number' ? at : now };
    }
  }

  return out;
}

/** Drops the oldest automatic entries past MAX_HISTORY; manual ones are left to the user. */
function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  let excess = entries.length - MAX_HISTORY;
  if (excess <= 0) return entries;

  const kept = [...entries];
  for (let index = kept.length - 1; index >= 0 && excess > 0; index -= 1) {
    if (!kept[index].manual) {
      kept.splice(index, 1);
      excess -= 1;
    }
  }

  return kept;
}

function sanitiseHistory(input: unknown): HistoryEntry[] {
  if (!Array.isArray(input)) return [];

  const entries = input
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<HistoryEntry>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.expression === 'string' &&
        (typeof candidate.value === 'number' || candidate.value === null) &&
        typeof candidate.at === 'number'
      );
    })
    // Entries saved before manual adds existed have no flag.
    .map((entry: HistoryEntry) => ({ ...entry, manual: entry.manual === true }));

  return capHistory(entries);
}

export default function Calculator({ initialExpression = '' }: CalculatorProps) {
  const [expression, setExpression] = useState(initialExpression);
  const [variables, setVariables] = useState<VariableEntries>({});
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
    let cancelled = false;

    void loadState().then((stored) => {
      if (cancelled) return;
      setVariables(sanitiseVariables(stored.variables));
      setHistory(sanitiseHistory(stored.history));
      setRestored(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;

    saveState({ variables, history }).catch(() => {
      // Storage can be full or blocked; the calculator still works without it.
    });
  }, [restored, variables, history]);

  // Keypad and chip insertions place the caret themselves. On touch screens focusing
  // would pop up the on-screen keyboard, so the caret only moves; the keyboard opens
  // when the text box itself is tapped.
  useEffect(() => {
    if (caret === null) return;

    const input = inputRef.current;
    if (input) {
      if (window.matchMedia('(pointer: fine)').matches) input.focus();
      input.setSelectionRange(caret, caret);
    }

    setCaret(null);
  }, [caret]);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // ExprTk only needs the numbers; recomputed only when a variable changes.
  const values = useMemo<VariableMap>(
    () => Object.fromEntries(Object.entries(variables).map(([name, entry]) => [name, entry.value])),
    [variables]
  );

  const evaluation = useMemo<EvalResult | null>(() => {
    if (!exprtk || expression.trim() === '') return null;

    try {
      return exprtk.evaluate(expression, values);
    } catch (error) {
      return { ok: false, value: 0, error: String(error), position: -1 };
    }
  }, [exprtk, expression, values]);

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

  // Automatic entries contained in the new expression are treated as drafts of it
  // and dropped. Re-recording an existing expression keeps its manual flag.
  const commit = useCallback(() => {
    if (!evaluation?.ok) return;

    const trimmed = expression.trim();
    const { value } = evaluation;

    setHistory((previous) => {
      const existing = previous.find((item) => item.expression === trimmed);
      const entry: HistoryEntry = {
        id: nextId(),
        expression: trimmed,
        value,
        at: Date.now(),
        manual: existing?.manual ?? false
      };
      const kept = previous.filter(
        (item) => item.expression !== trimmed && (item.manual || !trimmed.includes(item.expression))
      );

      return capHistory([entry, ...kept]);
    });
  }, [evaluation, expression]);

  // Waiting for the restore stops it from overwriting what was recorded meanwhile.
  useEffect(() => {
    if (restored) commit();
  }, [restored, commit]);

  // Manual adds skip both rules: the expression may be invalid and nothing is pruned.
  const addManually = useCallback(() => {
    const trimmed = expression.trim();
    if (trimmed === '') return;

    const entry: HistoryEntry = {
      id: nextId(),
      expression: trimmed,
      value: evaluation?.ok ? evaluation.value : null,
      at: Date.now(),
      manual: true
    };

    setHistory((previous) =>
      capHistory([entry, ...previous.filter((item) => item.expression !== trimmed)])
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
    setVariables((previous) => ({ ...previous, [name]: { value, at: Date.now() } }));
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
            <Numpad onInsert={insert} onBackspace={backspace} />
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
              canAdd={expression.trim() !== ''}
              onAdd={addManually}
              onReuse={reuse}
              onRemove={(id) => setHistory((previous) => previous.filter((item) => item.id !== id))}
              onClear={() => setHistory([])}
            />
          )}
        </div>
      </div>
    </main>
  );
}
