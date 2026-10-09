'use client';

import type { PageViewCalculation } from '@neuma/shared';
import { computePageCalculation, isPageCalculationAPortion, PAGE_VIEW_CALCULATION } from '@neuma/shared';
import { useFormatter, useTranslations } from 'next-intl';
import type { PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';

/** Shared by the table footer and each group footer so both format the result the same way. */
export const usePagesCalculationLabel = (): ((
  calculation: PageViewCalculation,
  property: PageSchemaProperty,
  values: readonly (PagePropertyValue | undefined)[],
) => null | string) => {
  const t = useTranslations('pages.collection');
  const format = useFormatter();

  return (calculation, property, values) => {
    if (calculation === PAGE_VIEW_CALCULATION.NONE) return null;
    const result = computePageCalculation(calculation, property.type, values);
    if (result === null) return null;
    const written = isPageCalculationAPortion(calculation)
      ? format.number(result, { style: 'percent' })
      : format.number(result, { maximumFractionDigits: 2 });
    const named = t(`calculations.${calculation}`);
    return `${named} ${written}`;
  };
};
