'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SIDEBAR_STORAGE_KEY } from '../constants/sidebar.constants';
import { isSidebarToggleShortcut } from '../lib/portal.keyboard.lib';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const readStoredCollapsed = (): boolean => {
  if (globalThis.window === undefined) {
    return false;
  }
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === null) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    return isBoolean(parsed) ? parsed : false;
  } catch {
    return false;
  }
};

const writeStoredCollapsed = (collapsed: boolean): void => {
  if (globalThis.window === undefined) {
    return;
  }
  localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed));
};

/**
 * Remembers whether the sidebar is collapsed.
 *
 * The first render must match what the server sent, so it always starts
 * expanded and adopts the stored preference right after mounting: reading
 * storage while rendering makes the browser and the server disagree and React
 * throws the whole tree away. The preference is written when someone changes
 * it, so adopting the stored value can never overwrite it.
 */
export const useSidebarCollapsed = (enableKeyboardShortcut = true): readonly [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState(false);
  const hasOwnChoice = useRef(false);

  useEffect(() => {
    if (!hasOwnChoice.current) setCollapsed(readStoredCollapsed());
  }, []);

  useEffect(() => {
    if (hasOwnChoice.current) writeStoredCollapsed(collapsed);
  }, [collapsed]);

  const toggle = useCallback((): void => {
    hasOwnChoice.current = true;
    setCollapsed((current) => !current);
  }, []);

  useEffect(() => {
    if (!enableKeyboardShortcut) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSidebarToggleShortcut(event)) {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcut, toggle]);

  return [collapsed, toggle] as const;
};
