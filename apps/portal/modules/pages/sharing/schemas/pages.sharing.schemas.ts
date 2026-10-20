import { BLOCK_ROLE_VALUES, blockPermissionsSchema, USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';

const sharingPersonSchema = z.object({ email: z.string(), id: z.string(), name: z.string() });

const sharingPrincipalSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.string() }),
  z.object({ kind: z.literal('space') }),
]);

const sharingRoleSchema = z.enum(BLOCK_ROLE_VALUES);

const sharingEntrySchema = z.object({
  principal: sharingPrincipalSchema,
  role: sharingRoleSchema,
  user: sharingPersonSchema.nullable(),
});

const sharingSourceSchema = z.object({ id: z.string(), title: z.string(), type: z.string() });

const sharingMemberSchema = sharingPersonSchema.extend({
  canReadSpace: z.boolean(),
  workspaceRole: z.enum(USER_ROLE_VALUES),
});

export const blockAccessSchema = z.object({
  blockId: z.string(),
  entries: z.array(sharingEntrySchema),
  inherited: z.object({ entries: z.array(sharingEntrySchema), source: sharingSourceSchema.nullable() }),
  isDeclaredHere: z.boolean(),
  members: z.array(sharingMemberSchema),
  source: sharingSourceSchema.nullable(),
  spaceId: z.string(),
  viewerId: z.string(),
});

export const blockAccessRequestSchema = z.object({ blockId: z.string().min(1) });

export const blockPermissionsRequestSchema = z.object({
  blockId: z.string().min(1),
  permissions: blockPermissionsSchema,
  spaceId: z.string().min(1),
});

export const blockTransactionsResponseSchema = z.object({
  transactions: z.array(
    z.object({
      error: z.object({ code: z.string(), message: z.string() }).optional(),
      id: z.string(),
    }),
  ),
});
