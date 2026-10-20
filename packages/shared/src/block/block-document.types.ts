import type { z } from 'zod';
import type { PageContent } from '../schemas/page-content.schema.js';
import type { PageCoverValue } from '../schemas/page-cover.schema.js';
import type { PageIcon } from '../schemas/page-icon.schema.js';
import type {
  blockFormatMarkersSchema,
  blockNestedLayerSchema,
  blockWrapperAttributesSchema,
} from './block-content.schemas.js';
import type { BlockContent } from './block-content.types.js';

/** A block row ready to be stored: its identity and place in the tree, plus content checked against its type. */
export type BlockDraft = BlockContent & {
  readonly children: readonly string[];
  readonly id: string;
  readonly parentId: string | null;
  readonly spaceId: string;
};

/** What `blocksToDocument` reads; a stored row fits it, and it is checked against the type schema on the way in. */
export interface BlockDocumentRow {
  readonly children: readonly string[];
  readonly format: unknown;
  readonly id: string;
  readonly parentId: string | null;
  readonly properties: unknown;
  readonly type: string;
}

export type BlockDocumentPropertyValues = Readonly<Record<string, string | number | boolean | readonly string[]>>;

export interface DocumentToBlocksInput {
  readonly content: PageContent;
  readonly cover: PageCoverValue | null | undefined;
  readonly icon: PageIcon | null | undefined;
  readonly pageId: string;
  readonly parentId: string | null;
  readonly propertyValues: BlockDocumentPropertyValues | null | undefined;
  readonly spaceId: string;
  readonly title: string;
}

export interface BlockTree {
  readonly blocks: readonly BlockDraft[];
  readonly page: BlockDraft;
}

export type BlockWrapperAttributes = z.infer<typeof blockWrapperAttributesSchema>;
export type BlockNestedLayer = z.infer<typeof blockNestedLayerSchema>;
export type BlockFormatMarkers = z.infer<typeof blockFormatMarkersSchema>;
