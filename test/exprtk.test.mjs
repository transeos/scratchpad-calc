// Exercises the compiled ExprTk WebAssembly module directly, so the tests fail
// if the submodule, the C++ bridge or the build flags regress.
//
// Run with: npm test   (build the module first with: npm run build:wasm)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import createExprtkModule from '../public/wasm/exprtk.mjs';

const CATALOGUE = fileURLToPath(new URL('../src/lib/catalogue.ts', import.meta.url));

/** One call per function offered by the Functions panel. */
const CATALOGUE_PROBES = {
  sin: ['sin(0)', 0],
  cos: ['cos(0)', 1],
  tan: ['tan(0)', 0],
  asin: ['asin(1)', Math.PI / 2],
  acos: ['acos(1)', 0],
  atan: ['atan(0)', 0],
  atan2: ['atan2(1, 1)', Math.PI / 4],
  sinh: ['sinh(0)', 0],
  cosh: ['cosh(0)', 1],
  tanh: ['tanh(0)', 0],
  asinh: ['asinh(0)', 0],
  acosh: ['acosh(1)', 0],
  atanh: ['atanh(0)', 0],
  sec: ['sec(0)', 1],
  csc: ['csc(pi/2)', 1],
  cot: ['cot(pi/4)', 1],
  sinc: ['sinc(1)', Math.sin(1)],

  sqrt: ['sqrt(16)', 4],
  pow: ['pow(2, 10)', 1024],
  root: ['root(27, 3)', 3],
  exp: ['exp(0)', 1],
  expm1: ['expm1(0)', 0],
  log: ['log(1)', 0],
  log2: ['log2(8)', 3],
  log10: ['log10(1000)', 3],
  log1p: ['log1p(0)', 0],
  logn: ['logn(8, 2)', 3],

  abs: ['abs(-7)', 7],
  ceil: ['ceil(1.2)', 2],
  floor: ['floor(1.8)', 1],
  round: ['round(1.5)', 2],
  roundn: ['roundn(3.14159, 2)', 3.14],
  trunc: ['trunc(3.75)', 3],
  frac: ['frac(3.75)', 0.75],
  sgn: ['sgn(-4)', -1],
  mod: ['mod(7, 3)', 1],

  min: ['min(3, 1, 2)', 1],
  max: ['max(3, 1, 2)', 3],
  avg: ['avg(1, 2, 3)', 2],
  sum: ['sum(1, 2, 3)', 6],
  mul: ['mul(2, 3, 4)', 24],
  clamp: ['clamp(0, 5, 10)', 5],
  iclamp: ['iclamp(0, 5, 10)', 0],
  inrange: ['inrange(0, 5, 10)', 1],
  hypot: ['hypot(3, 4)', 5],

  deg2rad: ['deg2rad(180)', Math.PI],
  rad2deg: ['rad2deg(pi)', 180],
  deg2grad: ['deg2grad(180)', 200],
  grad2deg: ['grad2deg(200)', 180],
  erf: ['erf(0)', 0],
  erfc: ['erfc(0)', 1],
  ncdf: ['ncdf(0)', 0.5]
};

let exprtk;

/** Evaluates without variables and asserts success. */
function value(expression, variables = {}) {
  const result = exprtk.evaluate(expression, variables);
  assert.equal(result.ok, true, `${expression} failed: ${result.error}`);
  return result.value;
}

before(async () => {
  exprtk = await createExprtkModule();
});

describe('module', () => {
  it('reports the ExprTk build it was compiled from', () => {
    const info = exprtk.libraryInfo();
    assert.equal(info.name, 'Mathematical Expression Toolkit');
    assert.match(info.version, /^2\.71828/);
    assert.match(info.date, /^\d{8}$/);
    assert.ok(Number(info.date) >= 20250101, `expected a 2025 or later build, got ${info.date}`);
  });
});

describe('arithmetic', () => {
  it('honours operator precedence', () => {
    assert.equal(value('1 + 2 * 3'), 7);
    assert.equal(value('(1 + 2) * 3'), 9);
    assert.equal(value('2 ^ 3 ^ 2'), 512);
    assert.equal(value('-2 ^ 2'), -4);
  });

  it('evaluates the long sum the old mock-up advertised', () => {
    assert.equal(value('1+2+3+4+5+6+7+8+9+10+11+12+13+14+15'), 120);
  });

  it('supports comparisons, logic and conditionals', () => {
    assert.equal(value('3 == 3'), 1);
    assert.equal(value('3 != 3'), 0);
    assert.equal(value('(3 > 2) and (1 < 2)'), 1);
    assert.equal(value('if(1 > 0, 10, 20)'), 10);
    assert.equal(value('2 > 1 ? 10 : 20'), 10);
  });

  it('provides the built-in constants', () => {
    assert.equal(value('pi'), Math.PI);
    assert.equal(value('e'), Math.E);
    assert.equal(value('inf'), Infinity);
    assert.ok(value('epsilon') > 0);
  });

  it('returns non-finite results rather than failing', () => {
    assert.equal(value('1 / 0'), Infinity);
    assert.ok(Number.isNaN(value('sqrt(-1)')));
  });
});

describe('variables', () => {
  it('binds values passed from JavaScript', () => {
    assert.equal(value('x ^ 2 + y', { x: 3, y: 1 }), 10);
    assert.ok(Math.abs(value('x1 + y1', { x1: 1.1, y1: 1.2 }) - 2.3) < 1e-12);
  });

  it('keeps bindings independent between calls', () => {
    assert.equal(value('x + 1', { x: 1 }), 2);
    assert.equal(value('x + 1', { x: 41 }), 42);
  });

  it('ignores non-numeric values', () => {
    const result = exprtk.evaluate('x + 1', { x: 'nonsense' });
    assert.equal(result.ok, false);
    assert.match(result.error, /Undefined symbol/);
  });

  it('handles many variables at once', () => {
    const variables = {};
    let expression = '0';

    for (let i = 0; i < 64; i += 1) {
      variables[`v${i}`] = i;
      expression += ` + v${i}`;
    }

    assert.equal(value(expression, variables), (63 * 64) / 2);
  });
});

describe('errors', () => {
  it('rejects an empty expression', () => {
    const result = exprtk.evaluate('   ', {});
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Empty expression');
  });

  it('reports undefined symbols', () => {
    const result = exprtk.evaluate('x + 1', {});
    assert.equal(result.ok, false);
    assert.match(result.error, /Undefined symbol: 'x'/);
  });

  it('reports a syntax error with the offending position', () => {
    const result = exprtk.evaluate('2 +* 3', {});
    assert.equal(result.ok, false);
    assert.ok(result.position >= 0, 'expected a token position');
    assert.ok(result.position < '2 +* 3'.length);
  });

  it('survives an unbalanced expression', () => {
    const result = exprtk.evaluate('sin(1', {});
    assert.equal(result.ok, false);
    assert.ok(result.error.length > 0);
  });
});

describe('collectVariables', () => {
  it('names the identifiers an expression depends on', () => {
    assert.deepEqual(exprtk.collectVariables('a * b + sin(c)'), ['a', 'b', 'c']);
  });

  it('returns nothing for a constant expression', () => {
    assert.deepEqual(exprtk.collectVariables('1 + 2'), []);
  });

  // The UI filters these out before warning about unbound variables.
  it('also reports the built-in constants', () => {
    assert.deepEqual(exprtk.collectVariables('pi + e'), ['e', 'pi']);
  });
});

describe('function catalogue', () => {
  const advertised = [...readFileSync(CATALOGUE, 'utf8').matchAll(/\bfn\('([A-Za-z0-9_]+)'/g)].map(
    (match) => match[1]
  );

  it('advertises functions in the UI', () => {
    assert.ok(advertised.length >= 50, `only found ${advertised.length} functions`);
  });

  it('has a probe for every advertised function', () => {
    const missing = advertised.filter((name) => !(name in CATALOGUE_PROBES));
    assert.deepEqual(missing, [], `no probe for: ${missing.join(', ')}`);
  });

  for (const [name, [expression, expected]] of Object.entries(CATALOGUE_PROBES)) {
    it(`evaluates ${name}`, () => {
      const actual = value(expression);
      assert.ok(
        Math.abs(actual - expected) < 1e-12,
        `${expression} gave ${actual}, expected ${expected}`
      );
    });
  }
});
