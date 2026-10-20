import { z } from 'zod';
import {
  BLOCK_PERMISSION_ENTRY_LIMIT,
  BLOCK_PERMISSION_USER_ID_MAX_LENGTH,
  BLOCK_PRINCIPAL_KIND,
  BLOCK_ROLE_VALUES,
} from './block.constants.js';

export const blockRoleSchema = z.enum(BLOCK_ROLE_VALUES);

const blockPrincipalSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal(BLOCK_PRINCIPAL_KIND.user),
      userId: z.string().min(1).max(BLOCK_PERMISSION_USER_ID_MAX_LENGTH),
    })
    .strict(),
  z.object({ kind: z.literal(BLOCK_PRINCIPAL_KIND.space) }).strict(),
]);

export const blockPermissionEntrySchema = z
  .object({
    principal: blockPrincipalSchema,
    role: blockRoleSchema,
  })
  .strict();

const readPrincipalKey = (entry: z.infer<typeof blockPermissionEntrySchema>): string =>
  entry.principal.kind === BLOCK_PRINCIPAL_KIND.user ? `user:${entry.principal.userId}` : BLOCK_PRINCIPAL_KIND.space;

const namesEachPrincipalOnce = (entries: readonly z.infer<typeof blockPermissionEntrySchema>[]): boolean =>
  new Set(entries.map(readPrincipalKey)).size === entries.length;

export const blockPermissionsSchema = z
  .array(blockPermissionEntrySchema)
  .max(BLOCK_PERMISSION_ENTRY_LIMIT)
  .refine(namesEachPrincipalOnce, { message: 'Each user and the space can appear only once in the permissions.' })
  .nullable();
