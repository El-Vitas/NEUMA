'use client';

import type { PageFilter } from '@neuma/shared';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '../constants/pages.row-context.constants';

interface IProps {
  readonly children: ReactNode;
  readonly quickFilter: null | PageFilter;
  readonly search: string;
}

export const PagesCollectionRowQueryProvider = ({ children, quickFilter, search }: IProps) => {
  const query = useMemo(() => ({ quickFilter, search }), [quickFilter, search]);

  return <PAGE_ROW_QUERY_CONTEXT value={query}>{children}</PAGE_ROW_QUERY_CONTEXT>;
};
