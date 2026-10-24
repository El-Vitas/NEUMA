import { describe, expect, it } from 'bun:test';
import { checkFormulaText, toFormulaPropertyInfo } from '@/modules/pages/collections/lib/pages.formula.lib';
import type { PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import { defaultConfig } from './pages.options.fixture';

const property = (key: string, label: string, type: PageSchemaProperty['type']): PageSchemaProperty => ({
  config: defaultConfig,
  key,
  label,
  options: null,
  required: false,
  type,
});

const properties = [property('price', 'Price', 'NUMBER'), property('quantity', 'Quantity', 'NUMBER')];

describe('checking the text of a formula while it is typed', () => {
  it('accepts a formula and tells the type it gives', () => {
    const check = checkFormulaText('prop("Price") * prop("Quantity")', properties);

    expect(check).toEqual({ isValid: true, resultType: 'NUMBER' });
  });

  it('refuses a property that does not exist and suggests the closest ones', () => {
    const check = checkFormulaText('prop("Prise") * 2', properties);

    expect(check.isValid).toBe(false);
    if (check.isValid) return;
    expect(check.problem.suggestions).toContain('Price');
  });

  it('refuses a formula that is not finished', () => {
    expect(checkFormulaText('prop("Price") *', properties).isValid).toBe(false);
  });
});

describe('a property as a formula reads it', () => {
  it('carries the type of the result for a property that is computed', () => {
    const rollup: PageSchemaProperty = {
      ...property('total', 'Total', 'ROLLUP'),
      computed: {
        formula: null,
        rollup: {
          calculation: 'SUM',
          relationPropertyKey: 'parts',
          resultType: 'NUMBER',
          targetCollectionId: 'collection-2',
          targetPropertyKey: 'cost',
        },
      },
    };

    expect(toFormulaPropertyInfo(rollup).resultType).toBe('NUMBER');
    expect(toFormulaPropertyInfo(property('price', 'Price', 'NUMBER')).resultType).toBeNull();
  });
});
