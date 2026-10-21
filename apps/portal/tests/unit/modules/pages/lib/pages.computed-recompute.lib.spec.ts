import { describe, expect, it } from 'bun:test';
import { parsePageFormula } from '@neuma/shared';
import { recomputeRowFormulas } from '@/modules/pages/collections/lib/pages.computed-recompute.lib';
import { toFormulaPropertyInfo } from '@/modules/pages/collections/lib/pages.formula.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';

const stored = (key: string, label: string): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label,
  options: null,
  required: false,
  type: 'NUMBER',
});

const price = stored('price', 'Price');
const quantity = stored('quantity', 'Quantity');

const formulaOver = (key: string, source: string, others: readonly PageSchemaProperty[]): PageSchemaProperty => {
  const parsed = parsePageFormula(source, others.map(toFormulaPropertyInfo));
  if (parsed.isFail()) throw new Error(`The test formula is wrong: ${parsed.getError().message}`);
  return {
    ...stored(key, key),
    computed: { formula: parsed.getValue(), rollup: null },
    type: 'FORMULA',
  };
};

describe('the formulas of a row right after a value changes', () => {
  it('recomputes the formula that reads the property that changed', () => {
    const total = formulaOver('total', 'prop("Price") * prop("Quantity")', [price, quantity]);

    const recomputed = recomputeRowFormulas({
      editedKeys: new Set(['quantity']),
      properties: [price, quantity, total],
      values: { price: 10, quantity: 3 },
    });

    expect(recomputed.values).toEqual({ total: 30 });
    expect(recomputed.errors).toEqual({});
  });

  it('leaves alone a formula that does not read what changed', () => {
    const doubled = formulaOver('doubled', 'prop("Price") * 2', [price, quantity]);

    const recomputed = recomputeRowFormulas({
      editedKeys: new Set(['quantity']),
      properties: [price, quantity, doubled],
      values: { price: 10, quantity: 3 },
    });

    expect(recomputed.values).toEqual({});
  });

  it('follows a formula that reads another formula', () => {
    const doubled = formulaOver('doubled', 'prop("Price") * 2', [price]);
    const shifted = formulaOver('shifted', 'prop("doubled") + 1', [price, doubled]);

    const recomputed = recomputeRowFormulas({
      editedKeys: new Set(['price']),
      properties: [price, doubled, shifted],
      values: { price: 5 },
    });

    expect(recomputed.values).toEqual({ doubled: 10, shifted: 11 });
  });

  it('shows the error of a formula that cannot be computed with the new value', () => {
    const share = formulaOver('share', 'prop("Price") / prop("Quantity")', [price, quantity]);

    const recomputed = recomputeRowFormulas({
      editedKeys: new Set(['quantity']),
      properties: [price, quantity, share],
      values: { price: 10, quantity: 0 },
    });

    expect(recomputed.errors.share?.code).toBe('FORMULA_DIVISION_BY_ZERO');
  });

  it('waits for the server on a formula that depends on the clock', () => {
    const late = formulaOver('late', 'year(now()) + prop("Price")', [price]);

    const recomputed = recomputeRowFormulas({
      editedKeys: new Set(['price']),
      properties: [price, late],
      values: { price: 10 },
    });

    expect(recomputed.values).toEqual({});
    expect(recomputed.errors).toEqual({});
  });
});
