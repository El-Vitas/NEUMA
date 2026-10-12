import type { JsonValue } from '@neuma/db';
import type { UserRole } from '@neuma/shared';

export interface PageLinkReconciliationInput {
  readonly sourcePageId: string;
  readonly targetPageIds: readonly string[];
}

export interface BacklinkSourcePage {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface BacklinksResult {
  readonly count: number;
  readonly items: readonly BacklinkSourcePage[];
}

export interface PageLinkRepositoryContract {
  readonly listBacklinks: (
    targetPageId: string,
    workspaceId: string,
    userId: string,
    role: UserRole,
  ) => Promise<BacklinksResult>;
  readonly reconcile: (input: PageLinkReconciliationInput) => Promise<void>;
}

export interface PageLinkProjection {
  readonly reconcileLinks: (input: PageLinkReconciliationInput) => Promise<void>;
}

export interface LinksProjectionPage {
  readonly content: JsonValue;
  readonly id: string;
  readonly lifecycle: string;
}

export interface LinksProjectionSource {
  readonly findPage: (pageId: string) => Promise<LinksProjectionPage | null>;
}
