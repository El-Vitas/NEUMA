import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import {
  readPageComputedConfig,
  validatePageComputedConfig,
  writePageComputedConfig,
} from './page-formula.config.lib.js';
import { parsePageFormula } from './page-formula.parse.lib.js';
import type { PageFormulaPropertyInfo, PageRollupDefinition } from './page-formula.types.js';

const properties: readonly PageFormulaPropertyInfo[] = [
  { key: 'price', label: 'Precio', options: null, resultType: null, type: PAGE_PROPERTY_TYPE.NUMBER },
];

const rollup: PageRollupDefinition = {
  calculation: 'SUM',
  relationPropertyKey: 'items',
  resultType: 'NUMBER',
  targetCollectionId: 'collection-1',
  targetPropertyKey: 'points',
};

describe('what a formula or rollup property stores', () => {
  test('keeps a formula as it was saved', () => {
    const formula = parsePageFormula('prop("Precio") * 2', properties).getValue();

    const stored = writePageComputedConfig(PAGE_PROPERTY_TYPE.FORMULA, { formula, rollup: null });
    const read = readPageComputedConfig(JSON.parse(JSON.stringify(stored)));

    expect(read.formula).toEqual(formula);
    expect(read.rollup).toBeNull();
  });

  test('keeps a rollup as it was saved', () => {
    const stored = writePageComputedConfig(PAGE_PROPERTY_TYPE.ROLLUP, { formula: null, rollup });

    expect(readPageComputedConfig(JSON.parse(JSON.stringify(stored))).rollup).toEqual(rollup);
  });

  test('stores nothing for any other type', () => {
    expect(writePageComputedConfig(PAGE_PROPERTY_TYPE.NUMBER, { formula: null, rollup: null })).toBeNull();
  });

  test('reads what is damaged or missing as nothing, so a stored property still opens', () => {
    expect(readPageComputedConfig(null)).toEqual({ formula: null, rollup: null });
    expect(readPageComputedConfig({ formula: { source: 3 } })).toEqual({ formula: null, rollup: null });
    expect(readPageComputedConfig({ rollup: { calculation: 'SUM' } })).toEqual({ formula: null, rollup: null });
  });

  test('asks a formula to have a formula, a rollup to have a rollup, and nothing else to have either', () => {
    const formula = parsePageFormula('1', properties).getValue();

    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.FORMULA, { formula: null, rollup: null })).not.toBeNull();
    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.FORMULA, { formula, rollup: null })).toBeNull();
    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.ROLLUP, { formula: null, rollup: null })).not.toBeNull();
    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.ROLLUP, { formula: null, rollup })).toBeNull();
    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.NUMBER, { formula, rollup: null })).not.toBeNull();
    expect(validatePageComputedConfig(PAGE_PROPERTY_TYPE.NUMBER, { formula: null, rollup: null })).toBeNull();
  });
});
