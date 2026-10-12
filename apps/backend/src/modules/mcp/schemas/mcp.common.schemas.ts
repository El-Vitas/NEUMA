import { z } from 'zod';
import { MCP_OFFSET_CURSOR_PATTERN } from '../constants/mcp.constants';
import {
  MCP_ADDRESS_MAX_LENGTH,
  MCP_ID_MAX_LENGTH,
  MCP_REQUEST_ID_MAX_LENGTH,
} from '../constants/mcp.limits.constants';

export const mcpIdSchema = z.string().max(MCP_ID_MAX_LENGTH);

export const buildMcpAddressSchema = (description: string): z.ZodString =>
  z.string().trim().min(1).max(MCP_ADDRESS_MAX_LENGTH).describe(description);

/** Retrying a creating request with the same id does not create twice. */
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

/** Opaque: passed back exactly as the previous chunk returned it. */
export const buildMcpOffsetCursorSchema = (description: string): z.ZodOptional<z.ZodString> =>
  z.string().regex(MCP_OFFSET_CURSOR_PATTERN).optional().describe(description);
