// The ExprTk built-ins offered by the Functions panel. Every entry here is
// verified against the compiled module by test/exprtk.test.mjs.

export interface Insertable {
  label: string;
  /** Text spliced into the expression. */
  token: string;
  /** Caret position after insertion, measured from the start of the token. */
  caret: number;
  hint: string;
}

export interface FunctionGroup {
  name: string;
  entries: Insertable[];
}

/** Functions are inserted with their parentheses and the caret placed inside. */
function fn(name: string, hint: string): Insertable {
  return { label: name, token: `${name}()`, caret: name.length + 1, hint };
}

function op(label: string, token: string, hint: string): Insertable {
  return { label, token, caret: token.length, hint };
}

export const FUNCTION_GROUPS: FunctionGroup[] = [
  {
    name: 'Trigonometry',
    entries: [
      fn('sin', 'Sine of an angle in radians'),
      fn('cos', 'Cosine of an angle in radians'),
      fn('tan', 'Tangent of an angle in radians'),
      fn('asin', 'Arc sine, in radians'),
      fn('acos', 'Arc cosine, in radians'),
      fn('atan', 'Arc tangent, in radians'),
      fn('atan2', 'Arc tangent of y/x using the signs of both arguments'),
      fn('sinh', 'Hyperbolic sine'),
      fn('cosh', 'Hyperbolic cosine'),
      fn('tanh', 'Hyperbolic tangent'),
      fn('asinh', 'Inverse hyperbolic sine'),
      fn('acosh', 'Inverse hyperbolic cosine'),
      fn('atanh', 'Inverse hyperbolic tangent'),
      fn('sec', 'Secant, 1/cos(x)'),
      fn('csc', 'Cosecant, 1/sin(x)'),
      fn('cot', 'Cotangent, 1/tan(x)'),
      fn('sinc', 'Cardinal sine, sin(x)/x')
    ]
  },
  {
    name: 'Powers & logarithms',
    entries: [
      fn('sqrt', 'Square root'),
      fn('pow', 'pow(x, y) raises x to the power y'),
      fn('root', 'root(x, n) is the nth root of x'),
      fn('exp', 'e raised to the power x'),
      fn('expm1', 'exp(x) - 1, accurate for small x'),
      fn('log', 'Natural logarithm'),
      fn('log2', 'Base-2 logarithm'),
      fn('log10', 'Base-10 logarithm'),
      fn('log1p', 'log(1 + x), accurate for small x'),
      fn('logn', 'logn(x, n) is the base-n logarithm of x')
    ]
  },
  {
    name: 'Rounding & sign',
    entries: [
      fn('abs', 'Absolute value'),
      fn('ceil', 'Round up to the next integer'),
      fn('floor', 'Round down to the previous integer'),
      fn('round', 'Round to the nearest integer'),
      fn('roundn', 'roundn(x, n) rounds x to n decimal places'),
      fn('trunc', 'Discard the fractional part'),
      fn('frac', 'Keep only the fractional part'),
      fn('sgn', 'Sign of x: -1, 0 or 1'),
      fn('mod', 'mod(x, y) is the remainder of x/y')
    ]
  },
  {
    name: 'Aggregates & ranges',
    entries: [
      fn('min', 'Smallest of the arguments'),
      fn('max', 'Largest of the arguments'),
      fn('avg', 'Mean of the arguments'),
      fn('sum', 'Sum of the arguments'),
      fn('mul', 'Product of the arguments'),
      fn('clamp', 'clamp(lo, x, hi) confines x to [lo, hi]'),
      fn('iclamp', 'Inverse clamp: pushes x outside [lo, hi]'),
      fn('inrange', 'inrange(lo, x, hi) is 1 when lo <= x <= hi'),
      fn('hypot', 'hypot(x, y) is sqrt(x^2 + y^2)')
    ]
  },
  {
    name: 'Angles & statistics',
    entries: [
      fn('deg2rad', 'Degrees to radians'),
      fn('rad2deg', 'Radians to degrees'),
      fn('deg2grad', 'Degrees to gradians'),
      fn('grad2deg', 'Gradians to degrees'),
      fn('erf', 'Gauss error function'),
      fn('erfc', 'Complementary error function'),
      fn('ncdf', 'Normal cumulative distribution function')
    ]
  }
];

export const OPERATORS: Insertable[] = [
  op('+', ' + ', 'Addition'),
  op('−', ' - ', 'Subtraction'),
  op('×', ' * ', 'Multiplication'),
  op('÷', ' / ', 'Division'),
  op('%', ' % ', 'Remainder'),
  op('^', '^', 'Exponentiation'),
  op('( )', '()', 'Grouping'),
  op(',', ', ', 'Argument separator'),
  op('<', ' < ', 'Less than'),
  op('<=', ' <= ', 'Less than or equal'),
  op('>', ' > ', 'Greater than'),
  op('>=', ' >= ', 'Greater than or equal'),
  op('==', ' == ', 'Equal'),
  op('!=', ' != ', 'Not equal'),
  op('and', ' and ', 'Logical and'),
  op('or', ' or ', 'Logical or'),
  op('xor', ' xor ', 'Logical exclusive or'),
  op('not', 'not()', 'Logical negation')
];

/** Constants ExprTk defines for every expression. */
export const CONSTANTS: Insertable[] = [
  op('pi', 'pi', '3.14159265358979'),
  op('e', 'e', '2.71828182845905'),
  op('inf', 'inf', 'Positive infinity'),
  op('epsilon', 'epsilon', 'Smallest meaningful difference')
];

// The "( )" and "not()" entries want the caret between the parentheses.
for (const entry of [...OPERATORS]) {
  if (entry.token.endsWith('()')) {
    entry.caret = entry.token.length - 1;
  }
}
