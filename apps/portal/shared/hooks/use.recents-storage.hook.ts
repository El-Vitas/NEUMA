'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECENT_PAGES_MAX_ENTRIES } from '../constants/recents.constants';
import { readStoredText, removeStoredKeysWhere, writeStoredValue } from '../lib/browser-storage.lib';
import {
  buildRecentPagesStorageKey,
  clearRecentPages,
  isRecentPagesKeyOfAnotherPerson,
  parseStoredRecentPages,
  withRecordedVisit,
} from '../lib/recents.lib';
import type { RecentPageEntry, UseRecentPagesResult } from '../types/recents.types';
import { useRecentsOwner } from './use.recents-owner.hook';

export const useClearRecentPages = (): (() => void) => {
  const userId = useRecentsOwner();
  return useCallback(() => {
    if (userId !== null) clearRecentPages(userId);
  }, [userId]);
};

export const useRecentPages = (): UseRecentPagesResult => {
  const userId = useRecentsOwner();
  const [recentPages, setRecentPages] = useState<readonly RecentPageEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasReadOnMount = useRef(false);

  const readOwn = useCallback((): readonly RecentPageEntry[] => {
    if (userId === null) return [];
    return parseStoredRecentPages(readStoredText(buildRecentPagesStorageKey(userId)));
  }, [userId]);

  const refresh = useCallback((): void => {
    setRecentPages(readOwn());
    setHasLoaded(true);
  }, [readOwn]);

  useEffect(() => {
    if (hasReadOnMount.current) return;
    hasReadOnMount.current = true;
    if (userId !== null) {
      const ownKey = buildRecentPagesStorageKey(userId);
      removeStoredKeysWhere((key) => isRecentPagesKeyOfAnotherPerson(key, ownKey));
    }
    refresh();
  }, [refresh, userId]);

  const recordVisit = useCallback(
    (visit: Omit<RecentPageEntry, 'visitedAt'>): void => {
      if (userId === null) return;
      const updated = withRecordedVisit(readOwn(), { ...visit, visitedAt: Date.now() }, RECENT_PAGES_MAX_ENTRIES);
      writeStoredValue(buildRecentPagesStorageKey(userId), updated);
      setRecentPages(updated);
    },
    [readOwn, userId],
  );

  return { hasLoaded, recentPages, recordVisit, refresh };
};
