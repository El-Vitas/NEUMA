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
 * Remembers how wide the tree is.
 *
 * It starts at the value the server would render and only adopts the stored
 * preference right after mounting, for the same reason `useSidebarCollapsed`
 * does: reading storage during render makes the browser and the server
 * disagree and React throws the tree away.
 *
 * The handle is a real `<input type="range">`, so arrow keys, Home, End and
 * Page Up/Down already move it correctly on their own — nothing here
 * reimplements that. Only the pointer drag is still ours: the native slider
 * would otherwise map the pointer's position across its own rendered width,
 * which is a 44px touch target standing in for a 260px range, so dragging it
 * natively would be far more sensitive than dragging the handle used to be.
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
