import type { PageAuthor, PageContent } from '../../types/pages.types';

export interface PageVersionSummary {
  readonly author: PageAuthor | null;
  readonly createdAt: Date;
  readonly title: string;
  readonly version: number;
}

export interface PageVersionListing {
  readonly items: readonly PageVersionSummary[];
  /** The version to ask the next page from, or null when the list has ended. */
  readonly nextCursor: null | number;
}

export type PageHistoryLoadStatus = 'error' | 'idle' | 'loading' | 'ready';

export interface PageVersionDocument {
  readonly content: PageContent;
  readonly title: string;
  readonly version: number;
}

export interface PagesHistory {
  readonly didLoadMoreFail: boolean;
  readonly document: PageVersionDocument | null;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly items: readonly PageVersionSummary[];
  readonly listStatus: PageHistoryLoadStatus;
  readonly loadFirstPage: () => void;
  readonly loadMore: () => void;
  readonly previewStatus: PageHistoryLoadStatus;
  readonly select: (version: number) => void;
  readonly selectedVersion: null | number;
}
