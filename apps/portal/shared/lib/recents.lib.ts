import { RECENT_PAGES_STORAGE_PREFIX } from '../constants/recents.constants';
import { recentPagesListSchema } from '../schemas/recents.schemas';
import type { RecentPageEntry } from '../types/recents.types';
import { removeStoredValue } from './browser-storage.lib';
import { readJsonSafely } from './json.lib';

export const buildRecentPagesStorageKey = (userId: string): string => `${RECENT_PAGES_STORAGE_PREFIX}${userId}`;

/** Titles and space names belong to the person who read them, so they leave with them. */
export const clearRecentPages = (userId: string): void => removeStoredValue(buildRecentPagesStorageKey(userId));

export const isRecentPagesKeyOfAnotherPerson = (key: string, ownKey: string): boolean =>
  key !== ownKey && key.startsWith(RECENT_PAGES_STORAGE_PREFIX);

export const parseStoredRecentPages = (raw: string | null): readonly RecentPageEntry[] => {
  if (raw === null) return [];
  const parsed = recentPagesListSchema.safeParse(readJsonSafely(raw));
  return parsed.success ? parsed.data : [];
};

export const withRecordedVisit = (
  entries: readonly RecentPageEntry[],
  visit: RecentPageEntry,
  maxEntries: number,
): readonly RecentPageEntry[] => {
  const withoutSamePage = entries.filter((entry) => entry.pageId !== visit.pageId);
  return [visit, ...withoutSamePage].slice(0, maxEntries);
};
