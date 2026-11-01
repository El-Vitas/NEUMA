import type { PageQueryAggregateValue, PageQueryOutcome, PageViewCalculation } from '@neuma/shared';
import {
  PAGE_VIEW_CALCULATION_ITEM_PREFIX,
  PAGE_VIEW_COUNT_ITEM,
  PAGE_VIEW_COUNTS_REDUCER,
} from '../constants/pages.query.constants';
import type { PageQueryResult } from '../types/pages.query.types';
import type { PageViewAggregates } from '../types/pages.schema.types';

/**
 * A calculation is told by its property and by what it calculates: when the person picks another one, the answer
 * for the old one must not be shown under the new name while the new one is still being worked out.
 */
export const toCalculationItemId = (propertyKey: string, calculation: PageViewCalculation): string =>
  `${PAGE_VIEW_CALCULATION_ITEM_PREFIX}${propertyKey}:${calculation}`;

const toNumber = (value: PageQueryAggregateValue | undefined): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readCalculations = (
  values: Readonly<Record<string, PageQueryAggregateValue>>,
): Readonly<Record<string, number | null>> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([item]) => item.startsWith(PAGE_VIEW_CALCULATION_ITEM_PREFIX))
      .map(([item, value]) => [item, toNumber(value)]),
  );

/** A group of a board with bands is told by its column and its band together. */
export const toGroupCountKey = (key: string, subKey: string | null | undefined): string =>
  subKey === null || subKey === undefined || subKey === '' ? key : `${key}|${subKey}`;

/** The cards of a whole band of a board with bands: those of all its columns. */
export const sumGroupCountsOfBand = (counts: Readonly<Record<string, number>>, bandKey: string): number =>
  Object.entries(counts)
    .filter(([key]) => key.endsWith(`|${bandKey}`))
    .reduce((total, [, count]) => total + count, 0);

/** What the counts reducer answered, from the server or from the rows the browser holds. */
export const toViewAggregatesFromOutcome = (outcome: PageQueryOutcome | undefined): PageViewAggregates | null => {
  if (outcome?.kind !== 'aggregations') return null;
  return {
    calculations: readCalculations(outcome.totals),
    distinctRowCount: outcome.distinctRowCount,
    groupCalculations: Object.fromEntries(
      outcome.groups.map((group) => [toGroupCountKey(group.key, group.subKey), readCalculations(group.values)]),
    ),
    groupCounts: Object.fromEntries(
      outcome.groups.map((group) => [
        toGroupCountKey(group.key, group.subKey),
        toNumber(group.values[PAGE_VIEW_COUNT_ITEM]) ?? 0,
      ]),
    ),
  };
};

/** What the second phase of a view answered, or null if the counts could not be read. */
export const toViewAggregates = (result: PageQueryResult | null): PageViewAggregates | null =>
  toViewAggregatesFromOutcome(result?.reducers[PAGE_VIEW_COUNTS_REDUCER]);
