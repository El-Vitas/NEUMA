'use client';

import { usePagesCollectionLive } from '../hooks/use.pages.collection-live';

interface IProps {
  readonly collectionId: string;
}

/** Draws nothing: it keeps the open views of a collection in step with what others change. */
export const PagesCollectionLiveFollower = ({ collectionId }: IProps) => {
  usePagesCollectionLive(collectionId);
  return null;
};
