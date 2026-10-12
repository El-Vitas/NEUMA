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
 * The address names the panel, so opening, navigating and closing are all writes of a new address.
 * Closing first flushes the panel editor's pending save. The panel hangs off the right edge: dragging left grows it.
 */
export const usePagesSidePanel = (flushPendingChanges: () => Promise<void>): PagesSidePanelController => {
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
      router.push(buildAddressWithSearch(pathname, withPagesSidePanelParam(searchParams.toString(), pageId)), {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  /** Autosave is debounced and unmounting only cancels the wait, so pending changes are flushed before leaving. */
  const navigateWithinPanel = useCallback(
    async (_spaceId: string, pageId: string): Promise<void> => {
      await flushPendingChanges();
      openPanel(pageId);
    },
    [flushPendingChanges, openPanel],
  );

  const closePanel = useCallback(async (): Promise<void> => {
    await flushPendingChanges();
    router.replace(buildAddressWithSearch(pathname, withoutPagesSidePanelParam(searchParams.toString())), {
      scroll: false,
    });
  }, [flushPendingChanges, pathname, router, searchParams]);

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
