import type { Prisma } from '@neuma/db/generated';
import type { PageContent, UserRole } from '@neuma/shared';
import type { PageContentStoreOutcome } from './page.types';

export interface PageMaintenanceViewer {
  readonly role: UserRole;
  readonly userId: string;
  readonly workspaceId: string;
}

export interface PageMaintenanceRow {
  readonly content: Prisma.JsonValue;
  readonly id: string;
}

export type PageFillStep = 'givenIds' | 'reindex' | 'unreadable';

export interface PageBlocksFillOutcome {
  readonly pagesGivenIds: number;
  readonly pagesReindexed: number;
  /** Stored in a shape this version cannot read; left untouched. */
  readonly unreadablePages: number;
}

/** Saves through the normal change path, which already notifies search. */
export interface PageCollaborativeContentStore {
  readonly storeCollaborativeContent: (
    pageId: string,
    userId: string,
    content: PageContent,
  ) => Promise<PageContentStoreOutcome>;
}

export interface PageMaintenanceRepositoryContract {
  /** Keyset pagination in id order. */
  readonly listActivePages: (
    workspaceId: string,
    afterPageId: string | null,
    take: number,
  ) => Promise<readonly PageMaintenanceRow[]>;
  readonly announceReindex: (pageIds: readonly string[], runId: string) => Promise<void>;
}
