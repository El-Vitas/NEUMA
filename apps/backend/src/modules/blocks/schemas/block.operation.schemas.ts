import { blockPermissionsSchema, PAGE_LIFECYCLE_VALUES, PAGE_PROPERTY_KEY_MAX_LENGTH } from '@neuma/shared';
import { z } from 'zod';
import {
  BLOCK_COMMAND_VALUES,
  BLOCK_OPERATION_PATH_MAX_LENGTH,
  BLOCK_OPERATION_TABLE,
  BLOCK_PROPERTY_KEY_MAX_LENGTH,
  BLOCK_PROPERTY_KEY_PATTERN,
  BLOCK_SPACE_TABLE,
  BLOCK_TEXT_UPDATE_MAX_BASE64_LENGTH,
  BLOCK_TRUSTED_COMMAND_VALUES,
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

const buildEnvelopeSchema = <Commands extends readonly [string, ...string[]]>(commands: Commands) =>
  z
    .object({
      args: z.unknown(),
      command: z.enum(commands),
      path: z.array(z.string().max(BLOCK_PROPERTY_KEY_MAX_LENGTH)).max(BLOCK_OPERATION_PATH_MAX_LENGTH),
      pointer: z.object({ id: blockIdSchema, table: z.enum([BLOCK_OPERATION_TABLE, BLOCK_SPACE_TABLE]) }).strict(),
    })
    .strict();

export const blockOperationEnvelopeSchema = buildEnvelopeSchema(BLOCK_COMMAND_VALUES);

/** What the backend itself may send: the commands a client sends plus the page commands. */
export const blockTrustedOperationEnvelopeSchema = buildEnvelopeSchema(BLOCK_TRUSTED_COMMAND_VALUES);

export const blockSetLifecycleArgsSchema = z
  .object({
    detachFromParentId: blockIdSchema.optional(),
    lifecycle: z.enum(PAGE_LIFECYCLE_VALUES),
  })
  .strict();

export const blockSetLockArgsSchema = z.object({ locked: z.boolean() }).strict();

export const blockSetVerificationArgsSchema = z
  .object({ expiresAt: z.iso.datetime().nullable().optional(), verified: z.boolean() })
  .strict();

export const blockSetOwnerArgsSchema = z.object({ ownerId: blockIdSchema.nullable() }).strict();

/** A `null` value removes the key from the page values. */
export const blockMergePageValuesArgsSchema = z
  .object({ values: z.record(z.string().min(1).max(PAGE_PROPERTY_KEY_MAX_LENGTH), z.json()) })
  .strict();

export const blockMoveToSpaceRootArgsSchema = z
  .object({
    afterId: blockIdSchema.optional(),
    detachFromParentId: blockIdSchema.optional(),
    parentId: blockIdSchema.optional(),
    spaceId: blockIdSchema,
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
