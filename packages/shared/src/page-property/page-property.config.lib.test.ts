import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import {
  DEFAULT_PAGE_PROPERTY_CONFIG,
  readPagePropertyConfig,
  validatePagePropertyConfig,
  writePagePropertyConfig,
} from './page-property.config.lib.js';
import { PAGE_NUMBER_FORMAT } from './page-property.types.js';

describe('readPagePropertyConfig', () => {
  test('gives the neutral configuration to a property that stored none', () => {
    expect(readPagePropertyConfig(null)).toEqual(DEFAULT_PAGE_PROPERTY_CONFIG);
    expect(readPagePropertyConfig('nonsense')).toEqual(DEFAULT_PAGE_PROPERTY_CONFIG);
  });

  test('reads what is stored and keeps the neutral value for the rest', () => {
    expect(readPagePropertyConfig({ currency: 'CLP', decimals: 0, numberFormat: 'CURRENCY', prefix: 'TSK' })).toEqual({
      ...DEFAULT_PAGE_PROPERTY_CONFIG,
      currency: 'CLP',
      decimals: 0,
      numberFormat: PAGE_NUMBER_FORMAT.CURRENCY,
      prefix: 'TSK',
    });
  });

  test('ignores a field of the wrong kind', () => {
    expect(readPagePropertyConfig({ allowsMultiple: 'yes', decimals: 'two', numberFormat: 'BITCOIN' })).toEqual(
      DEFAULT_PAGE_PROPERTY_CONFIG,
    );
  });
});

describe('writePagePropertyConfig', () => {
  test('stores nothing for a type that has no configuration', () => {
    expect(writePagePropertyConfig(PAGE_PROPERTY_TYPE.SELECT, DEFAULT_PAGE_PROPERTY_CONFIG)).toBeNull();
  });

  test('stores only the fields of the type', () => {
    const config = { ...DEFAULT_PAGE_PROPERTY_CONFIG, allowsMultiple: true, prefix: 'X' };

    expect(writePagePropertyConfig(PAGE_PROPERTY_TYPE.PERSON, config)).toEqual({ allowsMultiple: true });
    expect(writePagePropertyConfig(PAGE_PROPERTY_TYPE.UNIQUE_ID, config)).toEqual({ prefix: 'X' });
  });

  test('stores a relation with its target and its mirror', () => {
    const config = { ...DEFAULT_PAGE_PROPERTY_CONFIG, mirrorPropertyKey: 'tasks', targetCollectionId: 'page-1' };

    expect(writePagePropertyConfig(PAGE_PROPERTY_TYPE.RELATION, config)).toEqual({
      mirrorPropertyKey: 'tasks',
      targetCollectionId: 'page-1',
    });
  });

  test('stores the number format with its decimals and currency', () => {
    const config = { ...DEFAULT_PAGE_PROPERTY_CONFIG, currency: 'USD', decimals: 2, numberFormat: 'CURRENCY' as const };

    expect(writePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, config)).toEqual({
      currency: 'USD',
      decimals: 2,
      numberFormat: 'CURRENCY',
    });
  });
});

describe('validatePagePropertyConfig', () => {
  test('accepts the neutral configuration on any type but a relation', () => {
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.SELECT, DEFAULT_PAGE_PROPERTY_CONFIG)).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, DEFAULT_PAGE_PROPERTY_CONFIG)).toBeNull();
  });

  test('refuses a configuration a type does not use', () => {
    const config = { ...DEFAULT_PAGE_PROPERTY_CONFIG, prefix: 'X' };

    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.SELECT, config)).not.toBeNull();
  });

  test('requires a currency code when the number is money', () => {
    const money = { ...DEFAULT_PAGE_PROPERTY_CONFIG, numberFormat: PAGE_NUMBER_FORMAT.CURRENCY };

    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, money)).not.toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, { ...money, currency: 'CLP' })).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, { ...money, currency: 'clp' })).not.toBeNull();
  });

  test('allows between 0 and 8 decimals', () => {
    const decimals = (count: number) => ({ ...DEFAULT_PAGE_PROPERTY_CONFIG, decimals: count });

    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, decimals(0))).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, decimals(8))).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, decimals(9))).not.toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, decimals(-1))).not.toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.NUMBER, decimals(1.5))).not.toBeNull();
  });

  test('limits the prefix of a unique id to a short word without spaces', () => {
    const prefix = (text: string) => ({ ...DEFAULT_PAGE_PROPERTY_CONFIG, prefix: text });

    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.UNIQUE_ID, prefix('TSK'))).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.UNIQUE_ID, prefix(''))).toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.UNIQUE_ID, prefix('a b'))).not.toBeNull();
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.UNIQUE_ID, prefix('ABCDEFGHIJK'))).not.toBeNull();
  });

  test('requires a relation to name its target collection', () => {
    expect(validatePagePropertyConfig(PAGE_PROPERTY_TYPE.RELATION, DEFAULT_PAGE_PROPERTY_CONFIG)).not.toBeNull();
    expect(
      validatePagePropertyConfig(PAGE_PROPERTY_TYPE.RELATION, {
        ...DEFAULT_PAGE_PROPERTY_CONFIG,
        targetCollectionId: 'page-1',
      }),
    ).toBeNull();
  });
});
