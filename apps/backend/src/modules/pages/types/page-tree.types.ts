import type { JsonValue } from '@neuma/db';
import type { PageIcon } from '@neuma/shared';
import type { PageOutlineReader, PageOutlineWindow } from './page-outline.types';

/** What the sidebar draws for a page: no content, and whether a chevron is worth showing (ADR 030). */
export interface PageTreeEntry {
  /** A page the reader can open sits right under it. Always false for a collection, whose rows are not in the tree. */
  readonly hasChildren: boolean;
  readonly hasOwnPermissions: boolean;
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly isCollection: boolean;
  readonly lifecycle: 'ACTIVE' | 'TRASHED';
  /** Place among the readable siblings. */
  readonly order: number;
  readonly parentId: string | null;
  readonly title: string;
  /** The version the database keeps on the block itself, the one the client record cache compares. */
  readonly version: number;
}

/** What the entries of a window need to know about their pages beyond the block itself. */
export interface PageTreeFacts {
  readonly collectionIds: ReadonlySet<string>;
  readonly parentsWithChildren: ReadonlySet<string>;
}

export interface PageTreeChildren {
  readonly entries: readonly PageTreeEntry[];
  readonly total: number;
}

export interface PageTreeLevel extends PageTreeChildren {
  readonly parentId: string | null;
  /** Where the window starts among the readable siblings. */
  readonly skip: number;
}

/** An ancestor the reader cannot open carries no id or title, so it is not named. */
export type PageTreeAncestor =
  | {
      readonly icon: PageIcon | null;
      readonly id: string;
      readonly isReadable: true;
      readonly lifecycle: 'ACTIVE' | 'TRASHED';
      readonly title: string;
    }
  | {
      readonly icon: null;
      readonly id: null;
      readonly isReadable: false;
      readonly lifecycle: null;
      readonly title: null;
    };

export interface PageTreePath {
  /** From the topmost down; the page itself is not in it. */
  readonly ancestors: readonly PageTreeAncestor[];
  /** One per readable level from the top, each opened on the window that holds the next page of the chain. */
  readonly levels: readonly PageTreeLevel[];
  /** The page asked for, also when it is in the trash and so absent from its level. */
  readonly page: PageTreeEntry;
}

export interface PageLookupEntry {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly lifecycle: 'ACTIVE' | 'TRASHED';
  readonly spaceId: string;
  readonly title: string;
  readonly version: number;
}

export interface PageLookupContent {
  readonly content: JsonValue;
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface PageRecentEntry {
  readonly icon: PageIcon | null;
  readonly id: string;
  readonly title: string;
  readonly updatedAt: Date;
  /** Who made the latest change. */
  readonly updatedByName: string | null;
}

export interface PageTreeRepositoryContract {
  readonly listAncestors: (pageId: string, reader: PageOutlineReader) => Promise<readonly PageTreeAncestor[] | null>;
  readonly listChildren: (
    spaceId: string,
    parentId: string | null,
    reader: PageOutlineReader,
    window: PageOutlineWindow,
  ) => Promise<PageTreeChildren>;
  readonly listRecent: (
    spaceId: string,
    reader: PageOutlineReader,
    take: number,
  ) => Promise<readonly PageRecentEntry[]>;
  readonly lookup: (pageIds: readonly string[], reader: PageOutlineReader) => Promise<readonly PageLookupEntry[]>;
  readonly lookupContent: (
    pageIds: readonly string[],
    reader: PageOutlineReader,
  ) => Promise<readonly PageLookupContent[]>;
  readonly readPath: (pageId: string, reader: PageOutlineReader, windowSize: number) => Promise<PageTreePath | null>;
}
