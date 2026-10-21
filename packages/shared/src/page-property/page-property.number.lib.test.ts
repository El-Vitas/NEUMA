import { describe, expect, test } from 'bun:test';
import { DEFAULT_PAGE_PROPERTY_CONFIG } from './page-property.config.lib.js';
import {
  formatPageNumber,
  fractionToPercent,
  hasAllowedDecimals,
  percentToFraction,
} from './page-property.number.lib.js';
import { PAGE_NUMBER_FORMAT } from './page-property.types.js';

const config = (changes: Partial<typeof DEFAULT_PAGE_PROPERTY_CONFIG>) => ({
  ...DEFAULT_PAGE_PROPERTY_CONFIG,
  ...changes,
});

describe('hasAllowedDecimals', () => {
  test('accepts anything when the decimals are free', () => {
    expect(hasAllowedDecimals(1.23456, config({}))).toBe(true);
  });

  test('refuses a value with more decimals than configured', () => {
    expect(hasAllowedDecimals(1.25, config({ decimals: 2 }))).toBe(true);
    expect(hasAllowedDecimals(1.255, config({ decimals: 2 }))).toBe(false);
    expect(hasAllowedDecimals(7, config({ decimals: 0 }))).toBe(true);
    expect(hasAllowedDecimals(7.5, config({ decimals: 0 }))).toBe(false);
  });

  test('counts the decimals of a percent as they are read, not as they are stored', () => {
    const percent = config({ decimals: 1, numberFormat: PAGE_NUMBER_FORMAT.PERCENT });

    expect(hasAllowedDecimals(0.255, percent)).toBe(true);
    expect(hasAllowedDecimals(0.2555, percent)).toBe(false);
  });
});

describe('percent conversion', () => {
  test('turns what a person reads into the stored fraction and back without float noise', () => {
    expect(percentToFraction(25)).toBe(0.25);
    expect(percentToFraction(7)).toBe(0.07);
    expect(fractionToPercent(0.07)).toBe(7);
    expect(fractionToPercent(0.255)).toBe(25.5);
  });
});

describe('formatPageNumber', () => {
  test('writes a plain number as it is, or with the decimals configured', () => {
    expect(formatPageNumber(1234.5, config({}))).toBe('1234.5');
    expect(formatPageNumber(1234.5, config({ decimals: 2 }))).toBe('1234.50');
  });

  test('writes a fraction as a percent', () => {
    expect(formatPageNumber(0.25, config({ numberFormat: PAGE_NUMBER_FORMAT.PERCENT }))).toBe('25%');
    expect(formatPageNumber(0.255, config({ decimals: 1, numberFormat: PAGE_NUMBER_FORMAT.PERCENT }))).toBe('25.5%');
  });

  test('writes money with its currency code', () => {
    expect(
      formatPageNumber(1500, config({ currency: 'CLP', decimals: 0, numberFormat: PAGE_NUMBER_FORMAT.CURRENCY })),
    ).toBe('CLP 1500');
    expect(
      formatPageNumber(9.5, config({ currency: 'USD', decimals: 2, numberFormat: PAGE_NUMBER_FORMAT.CURRENCY })),
    ).toBe('USD 9.50');
  });
});
