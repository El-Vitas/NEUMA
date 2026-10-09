import { accessTokenAccessSchema, USER_ROLE_VALUES } from '@neuma/shared';
import { z } from 'zod';

/** Validated by the HTTP gate, but it travels untyped through the SDK, so it is parsed again. */
export const mcpPrincipalSchema = z.object({
  access: accessTokenAccessSchema,
  role: z.enum(USER_ROLE_VALUES),
  tokenId: z.string().min(1),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
});
