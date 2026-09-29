import type { PageBlockEntry } from '@company-brain/shared';
import type { PageBlockSearchPage, PageBlockSearchQuery } from '../../../common/types/search.types';

export type {
  PageBlockSearchPage,
  PageBlockSearchQuery,
  PageBlockSearchReader,
  PageBlockSearchResult,
} from '../../../common/types/search.types';

/** Los bloques de una página en una versión: reemplazan a los que había, si no hay otros más nuevos. */
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
  readonly headingPath: string[] | null;
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
