import { describe, expect, it } from 'bun:test';
import { DatabasePropertyType } from '@neuma/db';
import type { PageFormulaOutcome, PageFormulaPropertyInfo, PagePropertyValue } from '@neuma/shared';
import { DEFAULT_PAGE_PROPERTY_CONFIG, parsePageFormula } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '@/common/domain/schema.domain.types';
import { evaluateComputedCells } from '@/modules/pages/domain/page-computed.domain';

const stored = (key: string, label: string, type: DatabasePropertyType): SchemaPropertyDefinition => ({
  config: DEFAULT_PAGE_PROPERTY_CONFIG,
  key,
  label,
  options: null,
  required: false,
  type,
});

const price = stored('price', 'Precio', DatabasePropertyType.NUMBER);
const items = stored('items', 'Lineas', DatabasePropertyType.RELATION);

const infoOf = (property: SchemaPropertyDefinition, resultType: PageFormulaPropertyInfo['resultType'] = null) => ({
  key: property.key,
  label: property.label,
  options: property.options,
  resultType,
  type: property.type,
});

const formulaProperty = (
  key: string,
  label: string,
  source: string,
  others: readonly SchemaPropertyDefinition[],
): SchemaPropertyDefinition => {
  const definition = parsePageFormula(
    source,
    others.map((other) => infoOf(other, other.computed?.formula?.resultType ?? other.computed?.rollup?.resultType)),
  ).getValue();
  return { ...stored(key, label, DatabasePropertyType.FORMULA), computed: { formula: definition, rollup: null } };
};

const rollupProperty: SchemaPropertyDefinition = {
  ...stored('sum', 'Suma', DatabasePropertyType.ROLLUP),
  computed: {
    formula: null,
    rollup: {
      calculation: 'SUM',
      relationPropertyKey: 'items',
      resultType: 'NUMBER',
      targetCollectionId: 'lines',
      targetPropertyKey: 'amount',
    },
  },
};

const amountInfo = infoOf(stored('amount', 'Monto', DatabasePropertyType.NUMBER));

const context = { nowMilliseconds: Date.parse('2026-10-21T12:00:00Z'), timeZone: 'UTC' };

const cellValue = (outcome: PageFormulaOutcome | undefined) => {
  if (outcome === undefined || !outcome.isOk) throw new Error(JSON.stringify(outcome));
  return outcome.value;
};

describe('evaluateComputedCells', () => {
  it('computes a formula for each row from the values of the row', () => {
    const doubled = formulaProperty('doubled', 'Doble', 'prop("Precio") * 2', [price]);

    const cells = evaluateComputedCells({
      context,
      properties: [price, doubled],
      rollupTargets: new Map(),
      rollupValues: new Map(),
      rows: [
        { id: 'a', values: { price: 5 } },
        { id: 'b', values: { price: 7 } },
      ],
    });

    expect(cellValue(cells.get('a')?.get('doubled'))).toBe(10);
    expect(cellValue(cells.get('b')?.get('doubled'))).toBe(14);
  });

  it('computes a rollup from the values of the related rows and lets a formula read it', () => {
    const rollupInfo = infoOf(rollupProperty, 'NUMBER');
    const withTax = formulaProperty('withTax', 'Con impuesto', 'prop("Suma") * 1.5', [rollupProperty, items]);
    expect(rollupInfo.resultType).toBe('NUMBER');
    const lines: readonly (PagePropertyValue | undefined)[] = [10, 20, undefined];

    const cells = evaluateComputedCells({
      context,
      properties: [items, rollupProperty, withTax],
      rollupTargets: new Map([['sum', amountInfo]]),
      rollupValues: new Map([['sum', new Map([['a', lines]])]]),
      rows: [{ id: 'a', values: {} }],
    });

    expect(cellValue(cells.get('a')?.get('sum'))).toBe(30);
    expect(cellValue(cells.get('a')?.get('withTax'))).toBe(45);
  });

  it('gives a rollup with no related rows its empty answer', () => {
    const cells = evaluateComputedCells({
      context,
      properties: [items, rollupProperty],
      rollupTargets: new Map([['sum', amountInfo]]),
      rollupValues: new Map(),
      rows: [{ id: 'a', values: {} }],
    });

    expect(cellValue(cells.get('a')?.get('sum'))).toBe(0);
  });

  it('reads a formula that depends on another formula whatever the order of the properties', () => {
    const base = formulaProperty('base', 'Base', 'prop("Precio") + 1', [price]);
    const top = formulaProperty('top', 'Cima', 'prop("Base") * 2', [price, base]);

    const cells = evaluateComputedCells({
      context,
      properties: [top, base, price],
      rollupTargets: new Map(),
      rollupValues: new Map(),
      rows: [{ id: 'a', values: { price: 4 } }],
    });

    expect(cellValue(cells.get('a')?.get('top'))).toBe(10);
  });

  it('keeps the error of one cell in that cell and passes it to the formulas that read it', () => {
    const broken = formulaProperty('broken', 'Rota', '1 / prop("Precio")', [price]);
    const reader = formulaProperty('reader', 'Lectora', 'prop("Rota") + 1', [price, broken]);

    const cells = evaluateComputedCells({
      context,
      properties: [price, broken, reader],
      rollupTargets: new Map(),
      rollupValues: new Map(),
      rows: [
        { id: 'zero', values: { price: 0 } },
        { id: 'two', values: { price: 2 } },
      ],
    });

    const failure = cells.get('zero')?.get('reader');
    expect(failure?.isOk).toBe(false);
    if (failure !== undefined && !failure.isOk) expect(failure.error.code).toBe('FORMULA_DEPENDENCY_ERROR');
    expect(cellValue(cells.get('two')?.get('reader'))).toBe(1.5);
  });

  it('turns a formula that throws into an error cell and still computes the other rows', () => {
    const doubled = formulaProperty('doubled', 'Doble', 'prop("Precio") * 2', [price]);
    const brokenValues = {
      get price(): number {
        throw new Error('internal detail that must not reach the cell');
      },
    };

    const cells = evaluateComputedCells({
      context,
      properties: [price, doubled],
      rollupTargets: new Map(),
      rollupValues: new Map(),
      rows: [
        { id: 'broken', values: brokenValues },
        { id: 'fine', values: { price: 4 } },
      ],
    });

    const failure = cells.get('broken')?.get('doubled');
    expect(failure?.isOk).toBe(false);
    if (failure !== undefined && !failure.isOk) {
      expect(failure.error.code).toBe('FORMULA_INVALID_ARGUMENT');
      expect(failure.error.message).not.toContain('internal detail');
    }
    expect(cellValue(cells.get('fine')?.get('doubled'))).toBe(8);
  });

  it('computes only the properties asked for and what they read', () => {
    const base = formulaProperty('base', 'Base', 'prop("Precio") + 1', [price]);
    const other = formulaProperty('other', 'Otra', 'prop("Precio") + 2', [price]);

    const cells = evaluateComputedCells({
      context,
      keys: new Set(['base']),
      properties: [price, base, other],
      rollupTargets: new Map(),
      rollupValues: new Map(),
      rows: [{ id: 'a', values: { price: 1 } }],
    });

    expect([...(cells.get('a')?.keys() ?? [])]).toEqual(['base']);
  });
});
