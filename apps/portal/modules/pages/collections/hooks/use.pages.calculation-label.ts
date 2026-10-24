'use client';

import type { PageViewCalculation } from '@neuma/shared';
import { isPageCalculationAPortion, PAGE_VIEW_CALCULATION } from '@neuma/shared';
import { useFormatter, useTranslations } from 'next-intl';

/** Shared by the table footer and each group footer so both format the result the same way. */
export const usePagesCalculationLabel = (): ((
  calculation: PageViewCalculation,
  result: null | number,
) => null | string) => {
  const t = useTranslations('pages.collection');
  const format = useFormatter();

  return (calculation, result) => {
    if (calculation === PAGE_VIEW_CALCULATION.NONE || result === null) return null;
    const written = isPageCalculationAPortion(calculation)
      ? format.number(result, { style: 'percent' })
      : format.number(result, { maximumFractionDigits: 2 });
    const named = t(`calculations.${calculation}`);
    return `${named} ${written}`;
  };
};
