import type { z } from 'zod';
import type { blockContentSchema } from './block-content.schemas.js';
import type {
  blockPlainTextSchema,
  blockRichTextSchema,
  blockTextEmbedSchema,
  blockTextMarksSchema,
} from './block-text.schemas.js';
import type {
  BLOCK_CONTENT_ERROR_CODE,
  BLOCK_NODE_DISPOSITION_KIND,
  BLOCK_TYPE_VALUES,
} from './block-type.constants.js';

export type BlockType = (typeof BLOCK_TYPE_VALUES)[number];

export type BlockRichText = z.infer<typeof blockRichTextSchema>;
export type BlockPlainText = z.infer<typeof blockPlainTextSchema>;
export type BlockTextMarks = z.infer<typeof blockTextMarksSchema>;
export type BlockTextEmbed = z.infer<typeof blockTextEmbedSchema>;

/** A block row validated against the schema of its type. */
export type BlockContent = z.infer<typeof blockContentSchema>;

export type BlockContentErrorCode = (typeof BLOCK_CONTENT_ERROR_CODE)[keyof typeof BLOCK_CONTENT_ERROR_CODE];

export interface BlockContentIssue {
  /** Dotted path from the row, such as `properties.title.0.insert` or `format.textColor`. */
  readonly field: string;
  readonly message: string;
}

export interface BlockContentError {
  readonly code: BlockContentErrorCode;
  readonly issues: readonly BlockContentIssue[];
  readonly type: string;
}

export type BlockNodeDispositionKind = (typeof BLOCK_NODE_DISPOSITION_KIND)[keyof typeof BLOCK_NODE_DISPOSITION_KIND];
