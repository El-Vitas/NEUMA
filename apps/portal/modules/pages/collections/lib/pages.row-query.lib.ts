import type { PagesRowQuery } from '../types/pages.row-query.types';

/** Rows read with another search or another quick filter are another answer, so this changes with either. */
export const readRowQueryKey = ({ quickFilter, search }: PagesRowQuery): string =>
  JSON.stringify([search, quickFilter]);
