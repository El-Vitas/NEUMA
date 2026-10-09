'use client';

import { useMemo } from 'react';
import { useResizablePanel } from '@/shared/hooks/use.resizable-panel.hook';
import {
  PORTAL_SIDEBAR_TREE_DEFAULT_WIDTH_PX,
  PORTAL_SIDEBAR_TREE_WIDTH_STORAGE_KEY,
} from '../constants/portal.sidebar.panel.constants';
import { clampPortalSidebarTreeWidth } from '../lib/portal.sidebar.panel.lib';
import type { PortalSidebarTreePanelController } from '../types/portal.sidebar.panel.types';

/**
 * Adopts the stored width after mount, like `useSidebarCollapsed`, to avoid a hydration mismatch.
 * Keyboard resizing comes from the native `<input type="range">`; only pointer drag is custom, because the native
 * slider would map the pointer across the 44px touch target instead of the full 260px range.
 */
export const useSidebarTreePanel = (): PortalSidebarTreePanelController => {
  const settings = useMemo(
    () => ({
      clamp: clampPortalSidebarTreeWidth,
      defaultWidth: PORTAL_SIDEBAR_TREE_DEFAULT_WIDTH_PX,
      grows: 'rightwards' as const,
      storageKey: PORTAL_SIDEBAR_TREE_WIDTH_STORAGE_KEY,
    }),
    [],
  );
  const { applyWidth, startResizing, width } = useResizablePanel(settings);

  return { handleWidthChange: applyWidth, startResizing, width };
};
