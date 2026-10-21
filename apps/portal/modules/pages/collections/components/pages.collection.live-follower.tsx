'use client';

import { usePagesCollectionLive } from '../hooks/use.pages.collection-live';

interface IProps {
  readonly collectionId: string;
  readonly spaceId: string;
}

/** Draws nothing: it keeps the open views of a collection in step with what others change. */
export const PagesCollectionLiveFollower = ({ collectionId, spaceId }: IProps) => {
  usePagesCollectionLive(collectionId, spaceId);
  return null;
};
