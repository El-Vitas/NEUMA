'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useResizablePanel } from '@/shared/hooks/use.resizable-panel.hook';
import {
  PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX,
  PAGES_SIDE_PANEL_SEARCH_PARAM,
  PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY,
} from '../constants/pages.side-panel.constants';
import {
  buildAddressWithSearch,
  clampPagesSidePanelWidth,
  withoutPagesSidePanelParam,
  withPagesSidePanelParam,
} from '../lib/pages.side-panel.lib';
import type { PagesSidePanelController } from '../types/pages.side-panel.types';

/**
 * The panel's own address, its width, and how one moves through both.
 *
 * The panel exists only because the address names it — a shared link or a
 * reload has to open the same page beside the same page — so opening,
 * navigating within and closing the panel are all the same operation: write a
 * new address. Closing is the one exception with a step before it: whatever
 * the panel's own editor still has to save is asked to finish first, so a
 * page closed moments after being written never loses what was written.
 *
 * The panel hangs off the right edge, so dragging left is what grows it.
 */
export const usePagesSidePanel = (flushBeforeClose: () => Promise<void>): PagesSidePanelController => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settings = useMemo(
    () => ({
      clamp: clampPagesSidePanelWidth,
      defaultWidth: PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX,
      grows: 'leftwards' as const,
      storageKey: PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY,
    }),
    [],
  );
  const { applyWidth, startResizing, width } = useResizablePanel(settings);

  const openPanel = useCallback(
    (pageId: string): void => {
      router.push(buildAddressWithSearch(pathname, withPagesSidePanelParam(searchParams.toString(), pageId)));
    },
    [pathname, router, searchParams],
  );

  const navigateWithinPanel = useCallback((_spaceId: string, pageId: string): void => openPanel(pageId), [openPanel]);

  const closePanel = useCallback(async (): Promise<void> => {
    await flushBeforeClose();
    router.replace(buildAddressWithSearch(pathname, withoutPagesSidePanelParam(searchParams.toString())));
  }, [flushBeforeClose, pathname, router, searchParams]);

  return {
    closePanel,
    handleWidthChange: applyWidth,
    navigateWithinPanel,
    openPanel,
    panelPageId: searchParams.get(PAGES_SIDE_PANEL_SEARCH_PARAM),
    startResizing,
    width,
  };
};
