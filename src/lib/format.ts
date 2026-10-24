// Presentation helpers shared by the calculator panels.

/** Doubles carry more digits than are meaningful here; trim to this many. */
const SIGNIFICANT_DIGITS = 12;

/**
 * Renders an ExprTk result, hiding binary-representation noise so that
 * 0.1 + 0.2 reads as 0.3 rather than 0.30000000000000004.
 */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  if (value === 0) return '0';

  const rounded = Number.parseFloat(value.toPrecision(SIGNIFICANT_DIGITS));
  const magnitude = Math.abs(rounded);

  if (magnitude >= 1e15 || magnitude < 1e-6) {
    return rounded.toExponential(6).replace(/\.?0+e/, 'e');
  }

  return String(rounded);
}

export function formatRelativeTime(from: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 45) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** ExprTk diagnostics arrive as "ERR042 - Something went wrong". */
export function formatDiagnostic(error: string): string {
  return error.replace(/^ERR\d+\s*-\s*/, '');
}

/** ExprTk identifiers: a leading letter or underscore, then word characters. */
export function isValidVariableName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** Names ExprTk already defines, which a user variable must not shadow. */
const RESERVED_NAMES = new Set([
  'pi', 'e', 'epsilon', 'inf', 'true', 'false',
  'and', 'or', 'not', 'xor', 'nand', 'nor', 'if', 'else', 'while', 'for'
]);

export function isReservedName(name: string): boolean {
  return RESERVED_NAMES.has(name.toLowerCase());
}
