import type { z } from 'zod';
import type { uploadFileInputSchema, uploadFileOutputSchema } from '../schemas/mcp.files.schemas';

export type McpUploadFileInput = z.infer<typeof uploadFileInputSchema>;
export type McpUploadFileOutput = z.infer<typeof uploadFileOutputSchema>;
