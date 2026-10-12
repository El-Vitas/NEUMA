'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { buildPagesSidePanelQueryHref } from '../lib/pages.side-panel.lib';

interface IProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly pageId: string;
}

/**
 * A real link, so the side page can be shared, reached with the back button or opened in a tab.
 * It keeps the whole address (view, filter) and replaces only the side page, and does not scroll.
 */
export const PagesSidePanelLink = ({ children, className, pageId }: IProps) => {
  const searchParams = useSearchParams();

  return (
    <Link className={className} href={buildPagesSidePanelQueryHref(searchParams.toString(), pageId)} scroll={false}>
      {children}
    </Link>
  );
};
