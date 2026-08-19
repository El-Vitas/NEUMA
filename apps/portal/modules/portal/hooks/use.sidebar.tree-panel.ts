'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PORTAL_SIDEBAR_TREE_DEFAULT_WIDTH_PX,
  PORTAL_SIDEBAR_TREE_WIDTH_STORAGE_KEY,
} from '../constants/portal.sidebar.panel.constants';
import { clampPortalSidebarTreeWidth } from '../lib/portal.sidebar.panel.lib';
import type { PortalSidebarTreePanelController } from '../types/portal.sidebar.panel.types';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readStoredJson = (key: string): unknown => {
  if (globalThis.window === undefined) return null;
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};

const readStoredWidth = (): number => {
  const parsed = readStoredJson(PORTAL_SIDEBAR_TREE_WIDTH_STORAGE_KEY);
  return isFiniteNumber(parsed) ? clampPortalSidebarTreeWidth(parsed) : PORTAL_SIDEBAR_TREE_DEFAULT_WIDTH_PX;
};

const writeStoredValue = (key: string, value: unknown): void => {
  if (globalThis.window === undefined) return;
  localStorage.setItem(key, JSON.stringify(value));
};

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
 * `startResizing` cancels that native behaviour and, while `isResizing` is
 * true, an effect owns the pair of global listeners it needs — attaching and
 * detaching the very same closures, so nothing is ever left listening.
 */
export const useSidebarTreePanel = (): PortalSidebarTreePanelController => {
  const [width, setWidth] = useState(PORTAL_SIDEBAR_TREE_DEFAULT_WIDTH_PX);
  const [isResizing, setIsResizing] = useState(false);
  const hasOwnWidthChoice = useRef(false);
  const resizeOrigin = useRef<{ pointerId: number; startWidth: number; startX: number } | null>(null);

  useEffect(() => {
    if (!hasOwnWidthChoice.current) setWidth(readStoredWidth());
  }, []);

  useEffect(() => {
    if (hasOwnWidthChoice.current) writeStoredValue(PORTAL_SIDEBAR_TREE_WIDTH_STORAGE_KEY, width);
  }, [width]);

  const applyWidth = useCallback((nextWidth: number): void => {
    hasOwnWidthChoice.current = true;
    setWidth(clampPortalSidebarTreeWidth(nextWidth));
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

    const handlePointerMove = (event: PointerEvent): void => {
      const origin = resizeOrigin.current;
      if (origin === null || event.pointerId !== origin.pointerId) return;
      applyWidth(origin.startWidth + (event.clientX - origin.startX));
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

  return { handleWidthChange: applyWidth, startResizing, width };
};
