import { accessTokenAccessSchema, USER_ROLE_VALUES } from '@company-brain/shared';
import { z } from 'zod';

/**
 * La identidad que la puerta HTTP ya validó y le pasa al servidor dentro de la
 * petición. Viaja como dato suelto por el SDK, así que se vuelve a leer con
 * forma y no se da por buena solo porque llegó.
 */
export const mcpPrincipalSchema = z.object({
  access: accessTokenAccessSchema,
  role: z.enum(USER_ROLE_VALUES),
  tokenId: z.string().min(1),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
});
