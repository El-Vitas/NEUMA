import { blockPermissionsSchema } from '@neuma/shared';
import { z } from 'zod';
import {
  BLOCK_COMMAND_VALUES,
  BLOCK_OPERATION_PATH_MAX_LENGTH,
  BLOCK_OPERATION_TABLE,
  BLOCK_PROPERTY_KEY_MAX_LENGTH,
  BLOCK_PROPERTY_KEY_PATTERN,
  BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH,
  BLOCK_TYPE_MAX_LENGTH,
} from '../constants/block.transaction.constants';
import { BLOCK_ID_MAX_LENGTH } from '../constants/blocks.constants';

export const blockIdSchema = z.string().min(1).max(BLOCK_ID_MAX_LENGTH);

export const blockPropertyKeySchema = z.string().max(BLOCK_PROPERTY_KEY_MAX_LENGTH).regex(BLOCK_PROPERTY_KEY_PATTERN);

const jsonObjectSchema = z.record(z.string(), z.json());

/** One schema per writable top-level field. */
export const blockFieldSchemas = {
  alive: z.boolean(),
  format: jsonObjectSchema.nullable(),
  parentId: blockIdSchema.nullable(),
  properties: jsonObjectSchema,
  type: z.string().min(1).max(BLOCK_TYPE_MAX_LENGTH),
} as const;

export const blockFieldPatchSchema = z.object(blockFieldSchemas).partial().strict();

export const blockCreateArgsSchema = z
  .object({
    format: blockFieldSchemas.format.optional(),
    id: blockIdSchema,
    parentId: blockFieldSchemas.parentId,
    properties: blockFieldSchemas.properties.optional(),
    type: blockFieldSchemas.type,
  })
  .strict();

export const blockEntryValueSchema = z.json();

export const blockEntriesSchema = jsonObjectSchema;

export const blockOperationEnvelopeSchema = z
  .object({
    args: z.unknown(),
    command: z.enum(BLOCK_COMMAND_VALUES),
    path: z.array(z.string().max(BLOCK_PROPERTY_KEY_MAX_LENGTH)).max(BLOCK_OPERATION_PATH_MAX_LENGTH),
    pointer: z.object({ id: blockIdSchema, table: z.literal(BLOCK_OPERATION_TABLE) }).strict(),
  })
  .strict();

export const blockListAfterArgsSchema = z.object({ after: blockIdSchema.optional(), id: blockIdSchema }).strict();

export const blockListBeforeArgsSchema = z.object({ before: blockIdSchema.optional(), id: blockIdSchema }).strict();

export const blockListRemoveArgsSchema = z.object({ id: blockIdSchema }).strict();

export const blockApplyTextArgsSchema = z
  .object({
    property: blockPropertyKeySchema,
    update: z.base64().min(1).max(BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH),
  })
  .strict();

export const blockSetPermissionArgsSchema = z.object({ permissions: blockPermissionsSchema }).strict();

export const blockStoredResultSchema = z.object({
  blocks: z.array(z.object({ id: z.string(), version: z.number().int() })),
  id: z.string(),
});
