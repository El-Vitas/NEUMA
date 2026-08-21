import type { UserRole } from '@company-brain/shared';

export interface PageViewEntry {
  readonly id: string;
  readonly name: string;
  readonly viewedAt: Date;
}

export interface PageViewsUsageSummary {
  readonly viewCount: number;
  readonly viewers: readonly PageViewEntry[];
}

export interface PageViewsSettings {
  readonly enabled: boolean;
}

export interface PageViewRepositoryContract {
  readonly countViews: (pageId: string) => Promise<number>;
  readonly createView: (pageId: string, userId: string) => Promise<void>;
  readonly findAccessiblePageId: (
    pageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<null | string>;
  readonly findLastViewedAt: (pageId: string, userId: string) => Promise<Date | null>;
  readonly getPageViewsEnabled: (workspaceId: string) => Promise<boolean>;
  readonly listViews: (pageId: string, limit: number) => Promise<readonly PageViewEntry[]>;
  readonly setPageViewsEnabled: (workspaceId: string, enabled: boolean) => Promise<boolean>;
}
