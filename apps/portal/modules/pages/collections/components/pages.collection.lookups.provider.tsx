'use client';

import type { ReactNode } from 'react';
import { PAGE_COLLECTION_LOOKUPS_CONTEXT } from '../constants/pages.lookups.context.constants';
import type { PageCollectionLookups } from '../types/pages.lookups.types';

interface IProps {
  readonly children: ReactNode;
  readonly lookups: PageCollectionLookups;
}

export const PagesCollectionLookupsProvider = ({ children, lookups }: IProps) => (
  <PAGE_COLLECTION_LOOKUPS_CONTEXT value={lookups}>{children}</PAGE_COLLECTION_LOOKUPS_CONTEXT>
);
