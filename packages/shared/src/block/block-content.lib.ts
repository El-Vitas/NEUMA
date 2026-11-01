import type { z } from 'zod';
import { Result } from '../result.js';
import { isOneOf } from '../value-list.lib.js';
import { blockContentSchema } from './block-content.schemas.js';
import type { BlockContent, BlockContentError, BlockContentIssue } from './block-content.types.js';
import { extractPlainText } from './block-text.lib.js';
import { BLOCK_CONTENT_ERROR_CODE, BLOCK_TYPE, BLOCK_TYPE_VALUES } from './block-type.constants.js';

const toFieldPath = (path: readonly PropertyKey[]): string => path.map(String).join('.');

const toIssues = (issue: z.core.$ZodIssue): readonly BlockContentIssue[] => {
  if (issue.code !== 'unrecognized_keys') return [{ field: toFieldPath(issue.path), message: issue.message }];
  return issue.keys.map((key) => ({ field: toFieldPath([...issue.path, key]), message: 'Unknown key' }));
};

/** Checks what a block row holds against the schema of its type. A missing `format` counts as empty. */
export const parseBlockContent = (
  type: string,
  properties: unknown,
  format: unknown,
): Result<BlockContent, BlockContentError> => {
  if (!isOneOf(BLOCK_TYPE_VALUES, type)) {
    return Result.fail({
      code: BLOCK_CONTENT_ERROR_CODE.unknownType,
      issues: [{ field: 'type', message: `Unknown block type ${type}` }],
      type,
    });
  }
  const parsed = blockContentSchema.safeParse({ format: format ?? {}, properties, type });
  if (parsed.success) return Result.ok(parsed.data);
  return Result.fail({
    code: BLOCK_CONTENT_ERROR_CODE.invalidContent,
    issues: parsed.error.issues.flatMap(toIssues),
    type,
  });
};

/** The text the block says by itself, for its `text` column; what its children say belongs to them. */
export const readBlockText = (content: BlockContent): string => {
  switch (content.type) {
    case BLOCK_TYPE.page:
    case BLOCK_TYPE.paragraph:
    case BLOCK_TYPE.heading:
    case BLOCK_TYPE.bulletedListItem:
    case BLOCK_TYPE.numberedListItem:
    case BLOCK_TYPE.toDo:
    case BLOCK_TYPE.codeBlock:
    case BLOCK_TYPE.toggle:
      return extractPlainText(content.properties.title);
    default:
      return '';
  }
};
