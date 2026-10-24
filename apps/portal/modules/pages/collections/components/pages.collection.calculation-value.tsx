'use client';

import type { PageViewCalculation } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { usePagesCalculationLabel } from '../hooks/use.pages.calculation-label';
import { toCalculationItemId } from '../lib/pages.query-aggregates.lib';
import type { PageViewAggregates } from '../types/pages.schema.types';

interface IProps {
  /** What the database says, which arrives after the rows; read here so the rest of the table is already drawn. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly calculation: PageViewCalculation;
  /** Absent for the whole view; the key of a group for the footer of that group. */
  readonly groupKey?: string;
  readonly propertyKey: string;
}

/** What one calculation says, or "calculating" while the answer for the chosen calculation has not arrived. */
export const PagesCollectionCalculationValue = ({ aggregates, calculation, groupKey, propertyKey }: IProps) => {
  const t = useTranslations('pages.collection');
  const label = usePagesCalculationLabel();
  const counted = use(aggregates);
  if (counted === null) return t('calculate');
  const itemId = toCalculationItemId(propertyKey, calculation);
  const answers = groupKey === undefined ? counted.calculations : (counted.groupCalculations[groupKey] ?? {});
  if (!(itemId in answers)) return groupKey === undefined ? t('calculating') : null;
  return label(calculation, answers[itemId] ?? null) ?? t('calculate');
};
