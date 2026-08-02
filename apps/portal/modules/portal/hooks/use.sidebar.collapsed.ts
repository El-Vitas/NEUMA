'use client';

import { useState } from 'react';
import { SIDEBAR_STORAGE_KEY } from '../constants/sidebar.constants';

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

export const useSidebarCollapsed = (): readonly [boolean, () => void] => {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);

  const toggle = (): void => {
    setCollapsed((current) => {
      const nextCollapsed = !current;
      writeStoredCollapsed(nextCollapsed);
      return nextCollapsed;
    });
  };

  return [collapsed, toggle] as const;
};
