import { describe, expect, test } from 'bun:test';
import { PAGE_PROPERTY_TYPE } from '../types/page-schema.types.js';
import { PAGE_VIEW_CALCULATION } from '../page-view/page-view.types.js';
import {
  computePageRollup,
  listPageRollupCalculationsFor,
  PAGE_ROLLUP_SHOW_ORIGINAL,
  readPageRollupResultType,
} from './page-formula.rollup.lib.js';
import type { PageFormulaPropertyInfo, PageFormulaValue } from './page-formula.types.js';

const numberTarget: PageFormulaPropertyInfo = {
  key: 'points',
  label: 'Puntos',
  options: null,
  resultType: null,
  type: PAGE_PROPERTY_TYPE.NUMBER,
};

const dateTarget: PageFormulaPropertyInfo = { ...numberTarget, key: 'due', type: PAGE_PROPERTY_TYPE.DATE };

const selectTarget: PageFormulaPropertyInfo = {
  key: 'stage',
  label: 'Etapa',
  options: [
    { color: null, group: null, id: 'o1', value: 'Abierta' },
    { color: null, group: null, id: 'o2', value: 'Cerrada' },
  ],
  resultType: null,
  type: PAGE_PROPERTY_TYPE.SELECT,
};

const checkboxTarget: PageFormulaPropertyInfo = { ...numberTarget, key: 'done', type: PAGE_PROPERTY_TYPE.CHECKBOX };

const valueOf = (outcome: ReturnType<typeof computePageRollup>): PageFormulaValue => {
  if (!outcome.isOk) throw new Error(outcome.error.message);
  return outcome.value;
};

const roll = (
  calculation: Parameters<typeof computePageRollup>[0]['calculation'],
  target: PageFormulaPropertyInfo,
  values: readonly (string | number | boolean | undefined | { start: string })[],
): PageFormulaValue => valueOf(computePageRollup({ calculation, target, values }));

describe('which calculations a rollup offers', () => {
  test('offers the footer calculations of the target plus showing the original values', () => {
    const forNumbers = listPageRollupCalculationsFor(PAGE_PROPERTY_TYPE.NUMBER);

    expect(forNumbers).toContain(PAGE_VIEW_CALCULATION.SUM);
    expect(forNumbers).toContain(PAGE_VIEW_CALCULATION.PERCENT_EMPTY);
    expect(forNumbers).toContain(PAGE_ROLLUP_SHOW_ORIGINAL);
    expect(forNumbers).not.toContain(PAGE_VIEW_CALCULATION.NONE);
  });

  test('offers the earliest and latest date only for dates', () => {
    expect(listPageRollupCalculationsFor(PAGE_PROPERTY_TYPE.DATE)).toContain(PAGE_VIEW_CALCULATION.MAXIMUM);
    expect(listPageRollupCalculationsFor(PAGE_PROPERTY_TYPE.RICH_TEXT)).not.toContain(PAGE_VIEW_CALCULATION.MAXIMUM);
  });

  test('gives the type of the result', () => {
    expect(readPageRollupResultType(PAGE_VIEW_CALCULATION.COUNT_ALL, PAGE_PROPERTY_TYPE.RICH_TEXT)).toBe('NUMBER');
    expect(readPageRollupResultType(PAGE_VIEW_CALCULATION.PERCENT_FILLED, PAGE_PROPERTY_TYPE.DATE)).toBe('NUMBER');
    expect(readPageRollupResultType(PAGE_VIEW_CALCULATION.MAXIMUM, PAGE_PROPERTY_TYPE.DATE)).toBe('DATE');
    expect(readPageRollupResultType(PAGE_VIEW_CALCULATION.MAXIMUM, PAGE_PROPERTY_TYPE.NUMBER)).toBe('NUMBER');
    expect(readPageRollupResultType(PAGE_ROLLUP_SHOW_ORIGINAL, PAGE_PROPERTY_TYPE.NUMBER)).toBe('LIST');
  });
});

describe('computing a rollup', () => {
  test('counts the related rows, with a value and without one', () => {
    const values = [3, undefined, 8, undefined];

    expect(roll(PAGE_VIEW_CALCULATION.COUNT_ALL, numberTarget, values)).toBe(4);
    expect(roll(PAGE_VIEW_CALCULATION.COUNT_FILLED, numberTarget, values)).toBe(2);
    expect(roll(PAGE_VIEW_CALCULATION.COUNT_EMPTY, numberTarget, values)).toBe(2);
    expect(roll(PAGE_VIEW_CALCULATION.PERCENT_FILLED, numberTarget, values)).toBe(0.5);
    expect(roll(PAGE_VIEW_CALCULATION.PERCENT_EMPTY, numberTarget, values)).toBe(0.5);
  });

  test('adds, averages and takes the ends of numbers', () => {
    const values = [3, 1, 8, 4];

    expect(roll(PAGE_VIEW_CALCULATION.SUM, numberTarget, values)).toBe(16);
    expect(roll(PAGE_VIEW_CALCULATION.AVERAGE, numberTarget, values)).toBe(4);
    expect(roll(PAGE_VIEW_CALCULATION.MINIMUM, numberTarget, values)).toBe(1);
    expect(roll(PAGE_VIEW_CALCULATION.MAXIMUM, numberTarget, values)).toBe(8);
    expect(roll(PAGE_VIEW_CALCULATION.MEDIAN, numberTarget, values)).toBe(3.5);
  });

  test('takes the earliest and latest of dates', () => {
    const values = [{ start: '2026-10-20' }, { start: '2026-10-05' }, undefined, { start: '2026-11-01' }];

    expect(roll(PAGE_VIEW_CALCULATION.MINIMUM, dateTarget, values)).toEqual({ start: '2026-10-05' });
    expect(roll(PAGE_VIEW_CALCULATION.MAXIMUM, dateTarget, values)).toEqual({ start: '2026-11-01' });
  });

  test('reads the checked portion of a checkbox', () => {
    expect(roll(PAGE_VIEW_CALCULATION.PERCENT_CHECKED, checkboxTarget, [true, false, true, true])).toBe(0.75);
  });

  test('answers a count of zero and an empty average when there are no related rows', () => {
    expect(roll(PAGE_VIEW_CALCULATION.COUNT_ALL, numberTarget, [])).toBe(0);
    expect(roll(PAGE_VIEW_CALCULATION.SUM, numberTarget, [])).toBe(0);
    expect(roll(PAGE_VIEW_CALCULATION.AVERAGE, numberTarget, [])).toBeNull();
    expect(roll(PAGE_VIEW_CALCULATION.MAXIMUM, numberTarget, [])).toBeNull();
    expect(roll(PAGE_VIEW_CALCULATION.PERCENT_FILLED, numberTarget, [])).toBeNull();
    expect(roll(PAGE_VIEW_CALCULATION.MAXIMUM, dateTarget, [])).toBeNull();
  });

  test('shows the original values by name', () => {
    expect(roll(PAGE_ROLLUP_SHOW_ORIGINAL, numberTarget, [3, undefined, 8])).toEqual([3, 8]);
    expect(roll(PAGE_ROLLUP_SHOW_ORIGINAL, selectTarget, ['o2', 'o1', undefined])).toEqual(['Cerrada', 'Abierta']);
  });

  test('refuses a calculation the target does not offer', () => {
    const outcome = computePageRollup({
      calculation: PAGE_VIEW_CALCULATION.SUM,
      target: selectTarget,
      values: ['o1'],
    });

    expect(outcome.isOk).toBe(false);
    if (!outcome.isOk) expect(outcome.error.code).toBe('ROLLUP_TARGET_UNAVAILABLE');
  });
});
