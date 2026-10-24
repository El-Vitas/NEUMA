'use client';

import { Suspense } from 'react';
import type { PageViewAggregates } from '../types/pages.schema.types';
import { PagesCollectionSelectionMatchingValue } from './pages.collection.selection-matching.value';

interface IProps {
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewId: string;
}

/** The count that says whether the marked rows are all of them arrives after the rows: it is read under Suspense. */
export const PagesCollectionSelectionMatching = ({ aggregates, pageId, spaceId, viewId }: IProps) => (
  <Suspense fallback={null}>
    <PagesCollectionSelectionMatchingValue aggregates={aggregates} pageId={pageId} spaceId={spaceId} viewId={viewId} />
  </Suspense>
);
