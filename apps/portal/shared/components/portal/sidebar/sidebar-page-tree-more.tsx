'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { buildSidebarTreeIndent, shouldOfferPortalSidebarNextWindow } from '@/modules/portal/lib/portal.sidebar.lib';
import { FOCUS_RING_CLASS } from '@/shared/constants/ui.constants';

interface IProps {
  readonly bounds: { readonly hasNext: boolean; readonly hasPrevious: boolean };
  readonly depth: number;
  readonly direction: 'next' | 'previous';
  readonly isLoading: boolean;
  /** How many of these pages are loaded, to tell a list that is still arriving from one that is complete. */
  readonly loadedCount: number;
  readonly onLoad: () => void;
}

/** The end of a window of pages: pressing it reads the next one, or the one before. Nothing when none is left. */
export const SidebarPageTreeMore = ({ bounds, depth, direction, isLoading, loadedCount, onLoad }: IProps) => {
  const t = useTranslations('pages.treePanel');
  const isOffered =
    direction === 'previous'
      ? bounds.hasPrevious
      : shouldOfferPortalSidebarNextWindow(bounds.hasNext, loadedCount, isLoading);
  if (!isOffered) return null;

  return (
    <li>
      <button
        className={cn(
          'flex min-h-11 w-full items-center gap-2 pr-2 text-left text-sidebar-foreground/55 text-xs hover:text-sidebar-foreground',
          FOCUS_RING_CLASS,
        )}
        disabled={isLoading}
        onClick={onLoad}
        style={{ paddingLeft: `${buildSidebarTreeIndent(depth) + 20}px` }}
        type="button"
      >
        {isLoading && <Loader2 aria-hidden="true" className="size-3 animate-spin" />}
        {isLoading ? t('loading') : t(direction === 'next' ? 'showMore' : 'showPrevious')}
      </button>
    </li>
  );
};
