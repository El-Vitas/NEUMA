'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECENT_PAGES_MAX_ENTRIES, RECENT_PAGES_STORAGE_KEY } from '../constants/recents.constants';
import { parseStoredRecentPages, withRecordedVisit } from '../lib/recents.lib';
import type { RecentPageEntry, UseRecentPagesResult } from '../types/recents.types';

const readStoredRecentPages = (): readonly RecentPageEntry[] =>
  parseStoredRecentPages(globalThis.localStorage.getItem(RECENT_PAGES_STORAGE_KEY));

export const useRecentPages = (): UseRecentPagesResult => {
  const [recentPages, setRecentPages] = useState<readonly RecentPageEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasReadOnMount = useRef(false);

  const refresh = useCallback((): void => {
    setRecentPages(readStoredRecentPages());
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasReadOnMount.current) refresh();
    hasReadOnMount.current = true;
  }, [refresh]);

  const recordVisit = useCallback((visit: Omit<RecentPageEntry, 'visitedAt'>): void => {
    const updated = withRecordedVisit(
      readStoredRecentPages(),
      { ...visit, visitedAt: Date.now() },
      RECENT_PAGES_MAX_ENTRIES,
    );
    globalThis.localStorage.setItem(RECENT_PAGES_STORAGE_KEY, JSON.stringify(updated));
    setRecentPages(updated);
  }, []);

  return { hasLoaded, recentPages, recordVisit, refresh };
};
