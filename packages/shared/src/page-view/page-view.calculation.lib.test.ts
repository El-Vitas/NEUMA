import { describe, expect, it } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import {
  computePageCalculation,
  isPageCalculationAPortion,
  listPageCalculationsFor,
} from './page-view.calculation.lib.js';
import { PAGE_VIEW_CALCULATION } from './page-view.types.js';

describe('listPageCalculationsFor', () => {
  it('offers counting for any property, because every answer is either there or not', () => {
    expect(listPageCalculationsFor(PAGE_PROPERTY_TYPE.RICH_TEXT)).toEqual([
      PAGE_VIEW_CALCULATION.NONE,
      PAGE_VIEW_CALCULATION.COUNT_ALL,
      PAGE_VIEW_CALCULATION.COUNT_FILLED,
      PAGE_VIEW_CALCULATION.COUNT_EMPTY,
      PAGE_VIEW_CALCULATION.PERCENT_FILLED,
      PAGE_VIEW_CALCULATION.PERCENT_EMPTY,
    ]);
  });

  it('offers arithmetic only where the answers are numbers', () => {
    expect(listPageCalculationsFor(PAGE_PROPERTY_TYPE.NUMBER)).toContain(PAGE_VIEW_CALCULATION.MEDIAN);
    expect(listPageCalculationsFor(PAGE_PROPERTY_TYPE.DATE)).not.toContain(PAGE_VIEW_CALCULATION.SUM);
  });

  it('offers the checked portion only to a checkbox', () => {
    expect(listPageCalculationsFor(PAGE_PROPERTY_TYPE.CHECKBOX)).toContain(PAGE_VIEW_CALCULATION.PERCENT_CHECKED);
    expect(listPageCalculationsFor(PAGE_PROPERTY_TYPE.NUMBER)).not.toContain(PAGE_VIEW_CALCULATION.PERCENT_CHECKED);
  });
});

describe('computePageCalculation', () => {
  const numbers = [3, 1, undefined, 8, 4];

  it('counts every row it was given, answered or not', () => {
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.COUNT_ALL, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBe(5);
  });

  it('tells apart the rows that answered from the ones that did not', () => {
    const values = ['written', '', undefined, 'also written'];
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.COUNT_FILLED, PAGE_PROPERTY_TYPE.RICH_TEXT, values)).toBe(2);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.COUNT_EMPTY, PAGE_PROPERTY_TYPE.RICH_TEXT, values)).toBe(2);
  });

  it('reads the filled and empty portions as parts of one', () => {
    const values = ['written', '', undefined, 'also written'];
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.PERCENT_FILLED, PAGE_PROPERTY_TYPE.RICH_TEXT, values)).toBe(
      0.5,
    );
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.PERCENT_EMPTY, PAGE_PROPERTY_TYPE.RICH_TEXT, values)).toBe(0.5);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.PERCENT_FILLED, PAGE_PROPERTY_TYPE.RICH_TEXT, [])).toBeNull();
    expect(isPageCalculationAPortion(PAGE_VIEW_CALCULATION.PERCENT_EMPTY)).toBe(true);
  });

  it('adds, averages and takes the ends of what the rows hold', () => {
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.SUM, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBe(16);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.AVERAGE, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBe(4);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.MINIMUM, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBe(1);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.MAXIMUM, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBe(8);
  });

  it('takes the middle one, and the middle of the two when there is no single middle', () => {
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.MEDIAN, PAGE_PROPERTY_TYPE.NUMBER, [1, 9, 5])).toBe(5);
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.MEDIAN, PAGE_PROPERTY_TYPE.NUMBER, [1, 9, 5, 3])).toBe(4);
  });

  it('reads the checked portion as a part of one, not as a count', () => {
    const values = [true, false, true, undefined];
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.PERCENT_CHECKED, PAGE_PROPERTY_TYPE.CHECKBOX, values)).toBe(
      0.5,
    );
  });

  it('says nothing rather than zero when there is nothing to say', () => {
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.SUM, PAGE_PROPERTY_TYPE.NUMBER, [])).toBeNull();
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.NONE, PAGE_PROPERTY_TYPE.NUMBER, numbers)).toBeNull();
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.AVERAGE, PAGE_PROPERTY_TYPE.NUMBER, [undefined])).toBeNull();
  });

  it('counts zero as an answer, because a zero is something the row said', () => {
    expect(computePageCalculation(PAGE_VIEW_CALCULATION.COUNT_FILLED, PAGE_PROPERTY_TYPE.NUMBER, [0, undefined])).toBe(
      1,
    );
  });
});
