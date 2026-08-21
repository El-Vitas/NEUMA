'use client';

import { useSearchParams } from 'next/navigation';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
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

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readStoredWidth = (): number => {
  if (globalThis.window === undefined) return PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX;
  try {
    const parsed = JSON.parse(localStorage.getItem(PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY) ?? 'null');
    return isFiniteNumber(parsed) ? clampPagesSidePanelWidth(parsed) : PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX;
  } catch {
    return PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX;
  }
};

/**
 * The panel's own address, its width, and how one moves through both.
 *
 * The panel exists only because the address names it — a shared link or a
 * reload has to open the same page beside the same page — so opening,
 * navigating within and closing the panel are all the same operation: write a
 * new address. Closing is the one exception with a step before it: whatever
 * the panel's own editor still has to save is asked to finish first, so a
 * page closed moments after being written never loses what was written.
 */
export const usePagesSidePanel = (flushBeforeClose: () => Promise<void>): PagesSidePanelController => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(PAGES_SIDE_PANEL_DEFAULT_WIDTH_PX);
  const hasOwnWidthChoice = useRef(false);
  const resizeOrigin = useRef<{ pointerId: number; startWidth: number; startX: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!hasOwnWidthChoice.current) setWidth(readStoredWidth());
  }, []);

  useEffect(() => {
    if (!hasOwnWidthChoice.current) return;
    if (globalThis.window === undefined) return;
    localStorage.setItem(PAGES_SIDE_PANEL_WIDTH_STORAGE_KEY, JSON.stringify(width));
  }, [width]);

  const applyWidth = useCallback((nextWidth: number): void => {
    hasOwnWidthChoice.current = true;
    setWidth(clampPagesSidePanelWidth(nextWidth));
  }, []);

  const startResizing = useCallback(
    (event: ReactPointerEvent<HTMLInputElement>): void => {
      event.preventDefault();
      event.currentTarget.focus();
      resizeOrigin.current = { pointerId: event.pointerId, startWidth: width, startX: event.clientX };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    /** The panel hangs off the right edge, so dragging left is what grows it. */
    const handlePointerMove = (event: PointerEvent): void => {
      const origin = resizeOrigin.current;
      if (origin === null || event.pointerId !== origin.pointerId) return;
      applyWidth(origin.startWidth - (event.clientX - origin.startX));
    };

    const stopResizing = (): void => {
      resizeOrigin.current = null;
      setIsResizing(false);
    };

    globalThis.addEventListener('pointermove', handlePointerMove);
    globalThis.addEventListener('pointerup', stopResizing);

    return () => {
      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', stopResizing);
    };
  }, [applyWidth, isResizing]);

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
