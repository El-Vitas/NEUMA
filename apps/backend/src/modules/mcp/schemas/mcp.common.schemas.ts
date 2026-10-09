import { z } from 'zod';
import { MCP_OFFSET_CURSOR_PATTERN } from '../constants/mcp.constants';
import {
  MCP_ADDRESS_MAX_LENGTH,
  MCP_ID_MAX_LENGTH,
  MCP_REQUEST_ID_MAX_LENGTH,
} from '../constants/mcp.limits.constants';

/** Un id tal como lo devuelve Company Brain. */
export const mcpIdSchema = z.string().max(MCP_ID_MAX_LENGTH);

/** Algo de Company Brain nombrado como el agente lo tenga a mano: su enlace o su id. */
export const buildMcpAddressSchema = (description: string): z.ZodString =>
  z.string().trim().min(1).max(MCP_ADDRESS_MAX_LENGTH).describe(description);

/**
 * El id que el agente le da a un pedido que crea algo. Si la respuesta no le
 * llega y reintenta con el mismo id, no se crea dos veces.
 */
export const mcpRequestIdShape = {
  requestId: z
    .string()
    .trim()
    .min(1)
    .max(MCP_REQUEST_ID_MAX_LENGTH)
    .optional()
    .describe(
      'Any id you choose for this call, such as a UUID. If you retry because no answer came back, send the same one: it is not done twice.',
    ),
};

/** El cursor de una lista que llega de a tramos: desde dónde sigue, tal como lo devolvió el tramo anterior. */
export const buildMcpOffsetCursorSchema = (description: string): z.ZodOptional<z.ZodString> =>
  z.string().regex(MCP_OFFSET_CURSOR_PATTERN).optional().describe(description);
