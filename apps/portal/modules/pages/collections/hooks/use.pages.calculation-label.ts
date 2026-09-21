'use client';

import type { PageViewCalculation } from '@company-brain/shared';
import { computePageCalculation, isPageCalculationAPortion, PAGE_VIEW_CALCULATION } from '@company-brain/shared';
import { useFormatter, useTranslations } from 'next-intl';
import type { PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';

/**
 * Cómo se lee el pie de una columna.
 *
 * Lo dicen dos sitios —el pie de la tabla, donde además se elige, y el de cada
 * grupo, que solo lo repite sobre sus filas—, así que la cuenta y la manera de
 * escribirla viven en uno solo: un porcentaje lleva su signo y lo demás se
 * escribe como el número que es, en el idioma de quien mira.
 */
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
