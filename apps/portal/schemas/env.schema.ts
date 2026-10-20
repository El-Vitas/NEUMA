import { z } from 'zod';

export const envSchema = z.object({
  BACKEND_URL: z.url().default('http://localhost:3000'),
  /** Address external agents use; BACKEND_URL may be internal to a container network. */
  MCP_PUBLIC_URL: z.url().default('http://localhost:3000/api/v1/mcp'),
  /** Turns the editor over to the block channel; off keeps the collaborative document. */
  NEXT_PUBLIC_BLOCK_EDITOR: z.stringbool().default(false),
  NEXT_PUBLIC_COLLABORATION_WS_URL: z.url().default('ws://localhost:3000/api/v1/collaboration'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
});
