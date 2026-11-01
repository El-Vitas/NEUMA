'use client';

import { usePagesComputedSources } from '../hooks/use.pages.computed-sources';

interface IProps {
  readonly collectionIds: readonly string[];
}

/** Draws nothing: it keeps the values of the rollups of a collection in step with the collections they read. */
export const PagesCollectionComputedSourcesFollower = ({ collectionIds }: IProps) => {
  usePagesComputedSources(collectionIds);
  return null;
};
