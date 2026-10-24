'use client';

import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { PageViewAggregates } from '../types/pages.schema.types';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
}

export const PagesCollectionRowCountValue = ({ aggregates }: IProps) => {
  const t = useTranslations('pages.collection');
  const counted = use(aggregates);

  return counted === null ? null : t('rowCount', { total: counted.distinctRowCount });
};
