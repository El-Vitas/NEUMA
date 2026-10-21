'use client';

import { use } from 'react';
import { sumGroupCountsOfBand, toGroupCountKey } from '../lib/pages.query-aggregates.lib';
import type { PageViewAggregates } from '../types/pages.schema.types';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  /** A whole band of a board with bands: the cards of all its columns, counted by what the band's value is. */
  readonly bandKey?: string | undefined;
  /** What to show if the count could not be worked out: the rows the server drew for the group. */
  readonly drawn: number;
  readonly groupKey?: string | undefined;
  readonly subKey?: string | undefined;
}

export const PagesCollectionGroupCountValue = ({ aggregates, bandKey, drawn, groupKey, subKey }: IProps) => {
  const counted = use(aggregates);
  if (counted === null) return drawn;
  if (bandKey !== undefined) return sumGroupCountsOfBand(counted.groupCounts, bandKey);
  return counted.groupCounts[toGroupCountKey(groupKey ?? '', subKey)] ?? 0;
};
