'use client';

import { useEffect } from 'react';
import { recordPageViewAction } from '../server/actions/pages.usage.actions';

interface IProps {
  readonly pageId: string;
}

export const PagesUsageRecorder = ({ pageId }: IProps) => {
  useEffect(() => {
    void recordPageViewAction({ pageId });
  }, [pageId]);

  return null;
};
