'use client';

import { useEffect } from 'react';
import { callAction } from '@/shared/lib/action-result';
import { recordPageViewAction } from '../server/actions/pages.usage.actions';

interface IProps {
  readonly pageId: string;
}

export const PagesUsageRecorder = ({ pageId }: IProps) => {
  useEffect(() => {
    void callAction(() => recordPageViewAction({ pageId }));
  }, [pageId]);

  return null;
};
