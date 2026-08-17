'use client';

import { useEffect } from 'react';
import { useRecentPages } from '@/shared/hooks/use.recents-storage.hook';

interface IProps {
  readonly pageId: string;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly title: string;
}

export const RecentPageRecorder = ({ pageId, spaceId, spaceName, title }: IProps) => {
  const { recordVisit } = useRecentPages();

  useEffect(() => {
    recordVisit({ pageId, spaceId, spaceName, title });
  }, [pageId, recordVisit, spaceId, spaceName, title]);

  return null;
};
