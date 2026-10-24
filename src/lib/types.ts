// Shared shapes for the calculator UI.

export interface HistoryEntry {
  id: string;
  expression: string;
  /** Null for a manually added expression that did not evaluate. */
  value: number | null;
  /** Epoch milliseconds. */
  at: number;
  /** Added from the History panel; never removed automatically. */
  manual: boolean;
}

export type VariableMap = Record<string, number>;

export interface VariableEntry {
  value: number;
  /** Epoch milliseconds of the last change. */
  at: number;
}

export type VariableEntries = Record<string, VariableEntry>;

export type ModuleStatus = 'loading' | 'ready' | 'failed';

/** Inserts text at the caret; `caret` is the offset to land on afterwards. */
export type InsertFn = (token: string, caret: number) => void;
