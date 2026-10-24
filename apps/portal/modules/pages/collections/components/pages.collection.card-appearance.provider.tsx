'use client';

import type { PageCardSize } from '@neuma/shared';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { PAGE_CARD_APPEARANCE_CONTEXT } from '../constants/pages.card-appearance.context.constants';

interface IProps {
  readonly children: ReactNode;
  readonly coverProperty: null | string;
  readonly size: PageCardSize;
}

export const PagesCollectionCardAppearanceProvider = ({ children, coverProperty, size }: IProps) => {
  const appearance = useMemo(() => ({ coverProperty, size }), [coverProperty, size]);

  return <PAGE_CARD_APPEARANCE_CONTEXT value={appearance}>{children}</PAGE_CARD_APPEARANCE_CONTEXT>;
};
