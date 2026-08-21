'use client';

import { useEffect } from 'react';
import { recordPageViewAction } from '../server/actions/pages.usage.actions';

interface IProps {
  readonly pageId: string;
}

/**
 * Marks a page as read the moment it opens, the same way the recent-pages
 * recorder does — mounted next to it, invisible, gone the instant the page
 * changes underneath it.
 */
export const PagesUsageRecorder = ({ pageId }: IProps) => {
  useEffect(() => {
    void recordPageViewAction({ pageId });
  }, [pageId]);

  return null;
};
