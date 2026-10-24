// Shared shapes for the calculator UI.

export interface HistoryEntry {
  id: string;
  expression: string;
  value: number;
  /** Epoch milliseconds. */
  at: number;
}

export type VariableMap = Record<string, number>;

export type ModuleStatus = 'loading' | 'ready' | 'failed';

/** Inserts text at the caret; `caret` is the offset to land on afterwards. */
export type InsertFn = (token: string, caret: number) => void;
