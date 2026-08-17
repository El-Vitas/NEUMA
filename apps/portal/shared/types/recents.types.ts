export interface RecentPageEntry {
  readonly pageId: string;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly title: string;
  readonly visitedAt: number;
}

export interface UseRecentPagesResult {
  readonly hasLoaded: boolean;
  readonly recentPages: readonly RecentPageEntry[];
  readonly recordVisit: (visit: Omit<RecentPageEntry, 'visitedAt'>) => void;
  readonly refresh: () => void;
}
