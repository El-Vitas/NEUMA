import type { BlockPermissions } from '@neuma/shared';
import type { SchemaPropertyValue } from '../../../common/domain/schema.domain.types';

/** A block that belongs to a page's own content: everything below the page except the pages it holds. */
export interface PageContentBlock {
  readonly children: readonly string[];
  readonly editedAt: Date;
  readonly editedById: string;
  readonly format: unknown;
  readonly id: string;
  readonly parentId: null | string;
  /** What the block declares for who may read it; null when it declares nothing and answers as the block above. */
  readonly permissions: BlockPermissions;
  readonly properties: unknown;
  readonly type: string;
}

/** The blocks of a page a viewer may read, and the ids of the ones left out with their branches. */
export interface ReadableContentBlocks {
  readonly hiddenIds: ReadonlySet<string>;
  readonly readable: readonly PageContentBlock[];
}

/** The blocks a page holds now, as the content of a write is compared against them. */
export interface PageContentSnapshot {
  readonly blocks: readonly PageContentBlock[];
  /** The children the page block lists, content blocks first and the pages it holds after them. */
  readonly pageChildren: readonly string[];
  readonly pageId: string;
  /** Blocks of the page that were removed and that the document names again, so they come back with their id. */
  readonly removed: readonly PageContentBlock[];
}

/** The page block, as far as its document needs it. */
export interface PageDocumentSource {
  readonly children: readonly string[];
  readonly format: unknown;
  readonly id: string;
  readonly parentId: null | string;
  readonly properties: unknown;
}

/** One operation in the wire shape of `POST /transactions`; the blocks module reads it like a client's. */
export interface PageBlockOperation {
  readonly args: unknown;
  readonly command: string;
  readonly path: readonly string[];
  readonly pointer: { readonly id: string; readonly table: string };
}

/** Where a new page goes among its siblings: right after one of them, or last. */
export interface PagePlacement {
  readonly afterSiblingId: null | string;
}

/** The list a page sits in: the children of the page that holds it, or the top-level pages of its space. */
export interface PageSiblings {
  readonly parentId: null | string;
  readonly spaceId: string;
}

/** The values to write so a page ends up with the ones it should have: a key that is gone is sent as null. */
export type PageValueChanges = Readonly<Record<string, null | SchemaPropertyValue>>;

/** The new ids of a copied branch: its pages by page id, and every block of those pages by block id. */
export interface DocumentIdMaps {
  readonly blocks: ReadonlyMap<string, string>;
  readonly pages: ReadonlyMap<string, string>;
}

/** What a token may reach, narrower than its owner: per page the nearest page rule wins, then its space's rule. */
export interface PageTokenScope {
  readonly allowedPageIds: readonly string[];
  readonly closedPageIds: readonly string[];
  readonly closedSpaceIds: readonly string[];
  readonly openSpaceIds: readonly string[];
  readonly readsEverywhere: boolean;
}
