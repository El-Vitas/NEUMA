import { recentPagesListSchema } from '../schemas/recents.schemas';
import type { RecentPageEntry } from '../types/recents.types';
import { readJsonSafely } from './json.lib';

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
