import type { JsonValue } from '@neuma/db';
import type { PageBlockEntry } from '@neuma/shared';
import type { PageBlockSearchPage, PageBlockSearchQuery } from '../../../common/types/search.types';

export type {
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchReader,
  PageBlockSearchResult,
} from '../../../common/types/search.types';

/** Replaces the stored blocks unless a newer version exists. */
export interface PageBlocksProjection {
  readonly blocks: readonly PageBlockEntry[];
  readonly pageId: string;
  readonly pageVersion: number;
  readonly spaceId: string;
}

export interface PageBlocksRemoval {
  readonly pageId: string;
  readonly pageVersion: number;
}

export interface PageBlockSearchRow {
  readonly blockId: string;
  readonly blockType: string;
  readonly headingPath: JsonValue;
  readonly isPageVerified: boolean;
  readonly pageId: string;
  readonly pageTitle: string;
  readonly parentPageTitle: string | null;
  readonly rank: number;
  readonly snippet: string;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly updatedAt: Date;
}

export interface PageBlockRepositoryContract {
  readonly locateBlock: (blockId: string, workspaceId: string) => Promise<readonly string[]>;
  readonly removeBlocks: (input: PageBlocksRemoval) => Promise<void>;
  readonly replaceBlocks: (input: PageBlocksProjection) => Promise<void>;
  readonly searchBlocks: (query: PageBlockSearchQuery) => Promise<PageBlockSearchPage>;
}
