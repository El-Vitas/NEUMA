'use client';

import { useEffect } from 'react';
import { useOptionalPagesTreeStore } from '../hooks/use.pages.tree';
import type { PageTreeEntry, PageTreeLevel } from '../types/pages.tree.types';

interface IProps {
  readonly levels: readonly PageTreeLevel[];
  /** The page that is open; it matters only when it is in the trash, because no list holds it. */
  readonly openPage: PageTreeEntry | null;
  readonly spaceId: string;
}

/** The path to the open page comes with the page, so the sidebar shows it open without asking for each level. */
export const PagesTreePathSeed = ({ levels, openPage, spaceId }: IProps) => {
  const store = useOptionalPagesTreeStore();

  useEffect(() => {
    store.seedLevels(spaceId, levels);
    if (openPage?.lifecycle === 'TRASHED') store.seedOpenPage(spaceId, openPage);
  }, [levels, openPage, spaceId, store]);

  return null;
};
