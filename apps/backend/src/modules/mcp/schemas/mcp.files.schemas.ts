import { z } from 'zod';
import {
  MCP_UPLOAD_BASE64_MAX_LENGTH,
  MCP_UPLOAD_CONTENT_TYPE_MAX_LENGTH,
  MCP_UPLOAD_NAME_MAX_LENGTH,
} from '../constants/mcp.limits.constants';
import { buildMcpAddressSchema, mcpIdSchema, mcpRequestIdShape } from './mcp.common.schemas';

export const uploadFileInputSchema = z.object({
  contentBase64: z
    .string()
    .min(1)
    .max(MCP_UPLOAD_BASE64_MAX_LENGTH)
    .describe('The bytes of the file, base64 encoded. Up to 10 MB once decoded, the same limit as the portal.'),
  contentType: z
    .string()
    .trim()
    .min(1)
    .max(MCP_UPLOAD_CONTENT_TYPE_MAX_LENGTH)
    .describe('The MIME type, such as application/pdf or image/png. Only the types the portal accepts are stored.'),
  name: z.string().trim().min(1).max(MCP_UPLOAD_NAME_MAX_LENGTH).describe('The file name, with its extension.'),
  page: buildMcpAddressSchema(
    'The page or row the file belongs to: a Neuma link to it, or its page id. Whoever may see that page may open the file.',
  ),
  ...mcpRequestIdShape,
});

export const uploadFileOutputSchema = z.object({
  contentType: z.string(),
  id: mcpIdSchema.describe('Put this id in a files column to attach the file to a row.'),
  name: z.string(),
  page: mcpIdSchema,
  size: z.number().int().nonnegative(),
});
