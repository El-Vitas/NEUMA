'use client';

import { useEffect, useState } from 'react';
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

export const useSidebarCollapsed = (enableKeyboardShortcut = true): readonly [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);

  useEffect(() => {
    writeStoredCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!enableKeyboardShortcut) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSidebarToggleShortcut(event)) {
        event.preventDefault();
        setCollapsed((current) => !current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcut]);

  const toggle = (): void => {
    setCollapsed((current) => !current);
  };

  return [collapsed, toggle] as const;
};
