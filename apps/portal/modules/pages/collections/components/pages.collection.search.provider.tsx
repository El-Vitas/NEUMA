'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { PAGE_ROW_SEARCH_CONTEXT } from '../constants/pages.row-context.constants';
import { rowMatchesQuery } from '../lib/pages.row-search.lib';
import type { PagesRowSearch } from '../types/pages.row-search.types';

interface IProps {
  readonly children: ReactNode;
  readonly searchTexts: readonly string[];
}

/** The query is not saved in the view: a view reopening with a search applied would look like it lost rows. */
export const PagesCollectionSearchProvider = ({ children, searchTexts }: IProps) => {
  const [query, setQuery] = useState('');

  const search = useMemo<PagesRowSearch>(
    () => ({
      matchCount: searchTexts.filter((searchText) => rowMatchesQuery(searchText, query)).length,
      matches: (searchText: string) => rowMatchesQuery(searchText, query),
      query,
      searching: query.trim() !== '',
      setQuery,
      total: searchTexts.length,
    }),
    [query, searchTexts],
  );

  return <PAGE_ROW_SEARCH_CONTEXT value={search}>{children}</PAGE_ROW_SEARCH_CONTEXT>;
};
