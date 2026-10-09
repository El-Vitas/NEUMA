'use client';

import type { ReactNode } from 'react';
import { TableRow } from '@/shared/components/ui/table';
import { usePagesRowSearch } from '../hooks/use.pages.row-search';

interface IProps {
  readonly children: ReactNode;
  readonly searchText: string;
}

/** Hides the row instead of unmounting it: rows are rendered by the server, so re-rendering per keystroke is costly. */
export const PagesCollectionTableRowShell = ({ children, searchText }: IProps) => {
  const search = usePagesRowSearch();

  return <TableRow hidden={search !== null && !search.matches(searchText)}>{children}</TableRow>;
};
