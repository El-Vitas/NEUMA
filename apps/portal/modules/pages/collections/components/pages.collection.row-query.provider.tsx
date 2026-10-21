'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '../constants/pages.row-context.constants';

interface IProps {
  readonly children: ReactNode;
  readonly search: string;
}

export const PagesCollectionRowQueryProvider = ({ children, search }: IProps) => {
  const query = useMemo(() => ({ search }), [search]);

  return <PAGE_ROW_QUERY_CONTEXT value={query}>{children}</PAGE_ROW_QUERY_CONTEXT>;
};
