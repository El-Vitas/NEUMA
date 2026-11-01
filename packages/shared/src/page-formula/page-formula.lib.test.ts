import { describe, expect, test } from 'bun:test';
import type { PagePropertyValues } from '../page-property/page-property.types.js';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_FORMULA_STEP_BUDGET } from './page-formula.constants.js';
import { PAGE_FORMULA_DATE_RUNNERS } from './page-formula.dates.lib.js';
import { evaluatePageFormula } from './page-formula.evaluate.lib.js';
import { parsePageFormula } from './page-formula.parse.lib.js';
import { tracePageFormula } from './page-formula.trace.lib.js';
import type {
  PageFormulaContext,
  PageFormulaOutcome,
  PageFormulaPropertyInfo,
  PageFormulaScope,
  PageFormulaValue,
} from './page-formula.types.js';

const properties: readonly PageFormulaPropertyInfo[] = [
  { key: 'price', label: 'Precio', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'quantity', label: 'Cantidad', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.NUMBER },
  { key: 'name', label: 'Nombre', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.TITLE },
  { key: 'due', label: 'Entrega', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.DATE },
  { key: 'done', label: 'Lista', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.CHECKBOX },
  {
    key: 'stage',
    label: 'Etapa',
    options: [{ color: null, group: null, id: 'opt-1', value: 'En curso' }],
    resultType: null,
    type: PAGE_PROPERTY_TYPE.SELECT,
  },
  {
    key: 'tags',
    label: 'Etiquetas',
    options: [
      { color: null, group: null, id: 'tag-a', value: 'alfa' },
      { color: null, group: null, id: 'tag-b', value: 'beta' },
    ],
    resultType: null,
    type: PAGE_PROPERTY_TYPE.MULTI_SELECT,
  },
  { key: 'notes', label: 'Notas', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.RICH_TEXT },
  { key: 'total', label: 'Total', options: null, resultType: 'NUMBER', type: PAGE_PROPERTY_TYPE.FORMULA },
];

const context: PageFormulaContext = {
  nowMilliseconds: Date.parse('2026-10-21T02:30:00Z'),
  timeZone: 'America/Santiago',
};

const failedComputed = (): PageFormulaOutcome => ({
  error: { code: 'FORMULA_DIVISION_BY_ZERO', message: 'broken' },
  isOk: false,
});

const buildScope = (
  values: PagePropertyValues,
  readComputed: PageFormulaScope['readComputed'] = () => ({ isOk: true, value: 100 }),
): PageFormulaScope => ({
  properties: new Map(properties.map((property) => [property.key, property])),
  readComputed,
  values,
});

const run = (source: string, values: PagePropertyValues = {}, scope?: PageFormulaScope): PageFormulaOutcome => {
  const parsed = parsePageFormula(source, properties);
  if (parsed.isFail()) throw new Error(`Did not parse: ${parsed.getError().message}`);
  return evaluatePageFormula(parsed.getValue().ast, scope ?? buildScope(values), context);
};

const valueOf = (source: string, values: PagePropertyValues = {}): PageFormulaValue => {
  const outcome = run(source, values);
  if (!outcome.isOk) throw new Error(`Failed: ${outcome.error.code} ${outcome.error.message}`);
  return outcome.value;
};

const errorCodeOf = (source: string, values: PagePropertyValues = {}): string => {
  const outcome = run(source, values);
  return outcome.isOk ? 'OK' : outcome.error.code;
};

describe('arithmetic, comparison and logic', () => {
  test('follows the usual precedence and parentheses', () => {
    expect(valueOf('1 + 2 * 3')).toBe(7);
    expect(valueOf('(1 + 2) * 3')).toBe(9);
    expect(valueOf('-4 + 10 % 4')).toBe(-2);
    expect(valueOf('10 / 4')).toBe(2.5);
  });

  test('compares and combines conditions with words or symbols', () => {
    expect(valueOf('1 < 2 and not (3 == 4)')).toBe(true);
    expect(valueOf('1 > 2 or 2 >= 2')).toBe(true);
    expect(valueOf('true && false')).toBe(false);
    expect(valueOf('false || !false')).toBe(true);
    expect(valueOf('"a" != "b"')).toBe(true);
  });

  test('chooses with if', () => {
    expect(valueOf('if(prop("Precio") > 100, "caro", "barato")', { price: 150 })).toBe('caro');
    expect(valueOf('if(prop("Precio") > 100, "caro", "barato")', { price: 50 })).toBe('barato');
  });

  test('reads properties by their label', () => {
    expect(valueOf('prop("Precio") * prop("Cantidad")', { price: 12, quantity: 3 })).toBe(36);
  });

  test('refuses to divide by zero', () => {
    expect(errorCodeOf('1 / 0')).toBe('FORMULA_DIVISION_BY_ZERO');
    expect(errorCodeOf('5 % 0')).toBe('FORMULA_DIVISION_BY_ZERO');
  });
});

describe('empty values', () => {
  test('pass through arithmetic and ordering but not through equality or empty()', () => {
    expect(valueOf('prop("Precio") + 1')).toBeNull();
    expect(valueOf('prop("Precio") > 1')).toBeNull();
    expect(valueOf('prop("Precio") == 0')).toBe(false);
    expect(valueOf('empty(prop("Precio"))')).toBe(true);
    expect(valueOf('empty(prop("Precio"))', { price: 3 })).toBe(false);
  });

  test('count as false in conditions and as nothing in text', () => {
    expect(valueOf('if(prop("Precio") > 1, "a", "b")')).toBe('b');
    expect(valueOf('concat("x", prop("Notas"), "y")')).toBe('xy');
    expect(valueOf('not prop("Lista")', {})).toBe(true);
  });
});

describe('text', () => {
  test('changes case, trims and measures', () => {
    expect(valueOf('upper("abc")')).toBe('ABC');
    expect(valueOf('lower("ABC")')).toBe('abc');
    expect(valueOf('trim("  hi ")')).toBe('hi');
    expect(valueOf('length("hello")')).toBe(5);
  });

  test('searches and replaces', () => {
    expect(valueOf('contains("hello world", "lo w")')).toBe(true);
    expect(valueOf('startsWith("hello", "he")')).toBe(true);
    expect(valueOf('endsWith("hello", "lo")')).toBe(true);
    expect(valueOf('replace("a-a-a", "a", "b")')).toBe('b-a-a');
    expect(valueOf('replaceAll("a-a-a", "a", "b")')).toBe('b-b-b');
    expect(valueOf('slice("abcdef", 1, 3)')).toBe('bc');
    expect(valueOf('slice("abcdef", 2)')).toBe('cdef');
  });

  test('joins text with + and concat, and formats other values', () => {
    expect(valueOf('"a" + "b"')).toBe('ab');
    expect(valueOf('concat("n=", 3)')).toBe('n=3');
    expect(valueOf('format(1.5)')).toBe('1.5');
    expect(valueOf('format(true)')).toBe('true');
  });

  test('reads option names, not ids', () => {
    expect(valueOf('prop("Etapa")', { stage: 'opt-1' })).toBe('En curso');
  });

  test('does not treat a regular expression as special', () => {
    expect(valueOf('replaceAll("a.b.c", ".", "-")')).toBe('a-b-c');
  });
});

describe('numbers', () => {
  test('rounds, bounds and converts', () => {
    expect(valueOf('round(2.567, 2)')).toBe(2.57);
    expect(valueOf('round(2.5)')).toBe(3);
    expect(valueOf('floor(2.9)')).toBe(2);
    expect(valueOf('ceil(2.1)')).toBe(3);
    expect(valueOf('abs(-3)')).toBe(3);
    expect(valueOf('sqrt(16)')).toBe(4);
    expect(valueOf('pow(2, 10)')).toBe(1024);
    expect(valueOf('min(3, 1, 2)')).toBe(1);
    expect(valueOf('max(3, 1, 2)')).toBe(3);
    expect(valueOf('sign(-9)')).toBe(-1);
    expect(valueOf('toNumber("42")')).toBe(42);
  });

  test('reports an argument that has no answer', () => {
    expect(errorCodeOf('sqrt(-1)')).toBe('FORMULA_INVALID_ARGUMENT');
    expect(errorCodeOf('toNumber("abc")')).toBe('FORMULA_INVALID_ARGUMENT');
  });
});

describe('dates', () => {
  test('adds and subtracts calendar units', () => {
    expect(valueOf('dateAdd(date("2026-10-20"), 3, "days")')).toEqual({ start: '2026-10-23' });
    expect(valueOf('dateSubtract(date("2026-10-20"), 1, "weeks")')).toEqual({ start: '2026-10-13' });
    expect(valueOf('dateAdd(date("2026-01-31"), 1, "months")')).toEqual({ start: '2026-02-28' });
    expect(valueOf('dateAdd(date("2026-10-20"), 1, "years")')).toEqual({ start: '2027-10-20' });
  });

  test('counts whole units between two dates', () => {
    expect(valueOf('dateBetween(date("2026-10-25"), date("2026-10-20"), "days")')).toBe(5);
    expect(valueOf('dateBetween(date("2026-10-20"), date("2026-10-25"), "days")')).toBe(-5);
    expect(valueOf('dateBetween(date("2026-12-15"), date("2026-10-20"), "months")')).toBe(1);
  });

  test('is relative to the clock and the zone of the viewer', () => {
    expect(valueOf('today()')).toEqual({ start: '2026-10-20' });
    expect(valueOf('now()')).toEqual({ start: '2026-10-21T02:30:00.000Z' });
    expect(valueOf('dateBetween(prop("Entrega"), today(), "days")', { due: { start: '2026-10-25' } })).toBe(5);
  });

  test('takes parts of a date', () => {
    const values = { due: { start: '2026-10-21' } };

    expect(valueOf('year(prop("Entrega"))', values)).toBe(2026);
    expect(valueOf('month(prop("Entrega"))', values)).toBe(10);
    expect(valueOf('day(prop("Entrega"))', values)).toBe(21);
    expect(valueOf('weekday(prop("Entrega"))', values)).toBe(3);
    expect(valueOf('formatDate(prop("Entrega"), "DD/MM/YYYY")', values)).toBe('21/10/2026');
  });

  test('reads the hour of an instant in the zone of the viewer', () => {
    expect(valueOf('hour(now())')).toBe(23);
    expect(valueOf('minute(now())')).toBe(30);
  });

  test('takes the start and end of a range', () => {
    const values = { due: { end: '2026-10-30', start: '2026-10-25' } };

    expect(valueOf('start(prop("Entrega"))', values)).toEqual({ start: '2026-10-25' });
    expect(valueOf('end(prop("Entrega"))', values)).toEqual({ start: '2026-10-30' });
  });

  test('converts to and from a timestamp', () => {
    expect(valueOf('timestamp(date("2026-10-21T00:00:00Z"))')).toBe(Date.parse('2026-10-21T00:00:00Z'));
    expect(valueOf('fromTimestamp(0)')).toEqual({ start: '1970-01-01T00:00:00.000Z' });
  });

  test('rejects text that is not a date', () => {
    expect(errorCodeOf('date("tomorrow")')).toBe('FORMULA_INVALID_ARGUMENT');
    expect(errorCodeOf('dateAdd(date("2026-10-20"), 1, "hours")')).toBe('FORMULA_INVALID_ARGUMENT');
  });

  test('passes an empty date along', () => {
    expect(valueOf('year(prop("Entrega"))')).toBeNull();
    expect(valueOf('dateAdd(prop("Entrega"), 1, "days")')).toBeNull();
  });
});

describe('lists', () => {
  test('reads, measures and joins a multi-select by option names', () => {
    const values = { tags: ['tag-a', 'tag-b'] };

    expect(valueOf('length(prop("Etiquetas"))', values)).toBe(2);
    expect(valueOf('join(prop("Etiquetas"), ", ")', values)).toBe('alfa, beta');
    expect(valueOf('contains(prop("Etiquetas"), "beta")', values)).toBe(true);
    expect(valueOf('empty(prop("Etiquetas"))', {})).toBe(true);
  });
});

describe('formulas that read other computed properties', () => {
  test('use the value computed for the row', () => {
    expect(valueOf('prop("Total") * 2')).toBe(200);
  });

  test('become an error when what they read is one', () => {
    const parsed = parsePageFormula('prop("Total") * 2', properties);
    const outcome = evaluatePageFormula(parsed.getValue().ast, buildScope({}, failedComputed), context);

    expect(outcome.isOk).toBe(false);
    if (!outcome.isOk) expect(outcome.error.code).toBe('FORMULA_DEPENDENCY_ERROR');
  });
});

describe('work limit', () => {
  test('stops a formula that walks over more than the budget', () => {
    const longText = 'x'.repeat(PAGE_FORMULA_STEP_BUDGET - 100);

    expect(errorCodeOf('upper(prop("Notas")) + lower(prop("Notas"))', { notes: longText })).toBe('FORMULA_WORK_LIMIT');
    expect(errorCodeOf('upper(prop("Notas"))', { notes: longText })).toBe('OK');
  });

  test('stops a text that grows past the limit', () => {
    const text = 'y'.repeat(6000);

    expect(errorCodeOf('prop("Notas") + prop("Notas")', { notes: text })).toBe('FORMULA_WORK_LIMIT');
  });
});

describe('tracing a formula', () => {
  test('gives the value of each part that is not a plain constant, in the order they are evaluated', () => {
    const source = 'if(prop("Precio") > 3, "caro", "barato")';
    const definition = parsePageFormula(source, properties).getValue();

    const trace = tracePageFormula(definition, buildScope({ price: 5 }), context);

    expect(trace.map((step) => step.text)).toEqual([
      'prop("Precio")',
      'prop("Precio") > 3',
      'if(prop("Precio") > 3, "caro", "barato")',
    ]);
    expect(trace.map((step) => (step.outcome.isOk ? step.outcome.value : 'error'))).toEqual([5, true, 'caro']);
  });

  test('shows where a part fails', () => {
    const definition = parsePageFormula('1 / prop("Precio")', properties).getValue();

    const trace = tracePageFormula(definition, buildScope({ price: 0 }), context);

    const last = trace.at(-1);
    expect(last?.outcome.isOk).toBe(false);
  });
});

describe('saving a formula', () => {
  test('infers the type of the result and the properties it reads', () => {
    const numeric = parsePageFormula('prop("Precio") * prop("Cantidad")', properties).getValue();
    const textual = parsePageFormula('concat(prop("Nombre"), "!")', properties).getValue();
    const flag = parsePageFormula('prop("Precio") > 1', properties).getValue();
    const date = parsePageFormula('dateAdd(prop("Entrega"), 1, "days")', properties).getValue();

    expect(numeric.resultType).toBe('NUMBER');
    expect([...numeric.references].sort((first, second) => first.localeCompare(second))).toEqual(['price', 'quantity']);
    expect(textual.resultType).toBe('TEXT');
    expect(flag.resultType).toBe('BOOLEAN');
    expect(date.resultType).toBe('DATE');
  });

  test('marks the formulas that depend on the clock', () => {
    expect(parsePageFormula('now()', properties).getValue().isClockDependent).toBe(true);
    expect(parsePageFormula('today()', properties).getValue().isClockDependent).toBe(true);
    expect(parsePageFormula('hour(prop("Entrega"))', properties).getValue().isClockDependent).toBe(true);
    expect(parsePageFormula('prop("Precio") + 1', properties).getValue().isClockDependent).toBe(false);
  });

  test('reports a syntax error with its position', () => {
    const error = parsePageFormula('1 + * 2', properties).getError();

    expect(error.code).toBe('FORMULA_SYNTAX');
    expect(error.from).toBe(4);
    expect(parsePageFormula('prop("Precio"', properties).getError().code).toBe('FORMULA_SYNTAX');
    expect(parsePageFormula('"abierto', properties).getError().code).toBe('FORMULA_SYNTAX');
    expect(parsePageFormula('', properties).getError().code).toBe('FORMULA_SYNTAX');
    expect(parsePageFormula('1 2', properties).getError().code).toBe('FORMULA_SYNTAX');
  });

  test('suggests the closest names for an unknown function or property', () => {
    const unknownFunction = parsePageFormula('uper("a")', properties).getError();
    const unknownProperty = parsePageFormula('prop("Precios")', properties).getError();

    expect(unknownFunction.code).toBe('FORMULA_UNKNOWN_FUNCTION');
    expect(unknownFunction.suggestions).toContain('upper');
    expect(unknownProperty.code).toBe('FORMULA_UNKNOWN_PROPERTY');
    expect(unknownProperty.suggestions).toContain('Precio');
  });

  test('does not find a function in what every object inherits', () => {
    expect(parsePageFormula('constructor("a")', properties).getError().code).toBe('FORMULA_UNKNOWN_FUNCTION');
    expect(parsePageFormula('toString(1)', properties).getError().code).toBe('FORMULA_UNKNOWN_FUNCTION');
  });

  test('refuses types that do not fit', () => {
    expect(parsePageFormula('"a" + 1', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
    expect(parsePageFormula('if(true, 1, "x")', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
    expect(parsePageFormula('if(1, 1, 2)', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
    expect(parsePageFormula('upper(3)', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
    expect(parsePageFormula('upper()', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
    expect(parsePageFormula('prop("Etiquetas")', properties).getError().code).toBe('FORMULA_TYPE_MISMATCH');
  });

  test('refuses a formula that is too long, too big or too deep', () => {
    expect(parsePageFormula(`"${'a'.repeat(2000)}"`, properties).getError().code).toBe('FORMULA_TOO_LARGE');
    expect(parsePageFormula(Array.from({ length: 300 }, () => '1').join(' + '), properties).getError().code).toBe(
      'FORMULA_TOO_LARGE',
    );
    expect(parsePageFormula(`${'('.repeat(30)}1${')'.repeat(30)}`, properties).getError().code).toBe(
      'FORMULA_TOO_LARGE',
    );
  });

  test('fails the cell, not the query, when a date moves outside the dates that exist', () => {
    expect(errorCodeOf('dateAdd(now(), 1000000000, "days")')).toBe('FORMULA_INVALID_ARGUMENT');
    expect(errorCodeOf('dateAdd(now(), 1000000000, "years")')).toBe('FORMULA_INVALID_ARGUMENT');
    expect(errorCodeOf('dateSubtract(date("2026-10-20"), 1000000000, "months")')).toBe('FORMULA_INVALID_ARGUMENT');
  });

  test('refuses a replacement that would grow past the text limit without building it', () => {
    const big = 'a'.repeat(1000);

    expect(errorCodeOf(`replaceAll("${big}", "a", "${'b'.repeat(20)}")`)).toBe('FORMULA_WORK_LIMIT');
    expect(errorCodeOf(`replaceAll("${big}", "a", "${'b'.repeat(5)}")`)).toBe('OK');
  });

  test('never throws for any mix of functions and awkward arguments', () => {
    const functionNames = Object.keys(PAGE_FORMULA_DATE_RUNNERS);
    const awkward = ['0', '-1', '1e308', '-1e308', '1000000000', '9007199254740993', 'now()', 'today()', '""', '"x"'];
    const units = ['"days"', '"months"', '"years"', '"hours"', '"minutes"', '"weeks"', '"bogus"'];
    let seed = 12345;
    const pick = <Item>(items: readonly Item[]): Item => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return items[seed % items.length];
    };
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const name = pick(functionNames);
      const source = `${name}(${pick(awkward)}, ${pick(awkward)}, ${pick(units)})`;
      const parsed = parsePageFormula(source, properties);
      if (parsed.isFail()) continue;
      expect(() => evaluatePageFormula(parsed.getValue().ast, buildScope({}), context)).not.toThrow();
    }
  });

  test('gives a nested formula the type its pieces agree on', () => {
    const definition = parsePageFormula('if(contains(prop("Nombre"), "a"), 1, 2) + 1', properties).getValue();

    expect(definition.resultType).toBe('NUMBER');
  });
});
