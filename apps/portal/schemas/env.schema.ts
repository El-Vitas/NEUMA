import { z } from 'zod';

export const envSchema = z.object({
  BACKEND_URL: z.url().default('http://localhost:3000'),
  /** Address external agents use; BACKEND_URL may be internal to a container network. */
  MCP_PUBLIC_URL: z.url().default('http://localhost:3000/api/v1/mcp'),
  NEXT_PUBLIC_LIVE_WS_URL: z.url().default('ws://localhost:3000/api/v1/blocks/live'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
});
