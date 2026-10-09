import { env } from '@/config/env.config';

export const config = {
  backendApiUrl: env.BACKEND_URL,
  mcpPublicUrl: env.MCP_PUBLIC_URL,
  nodeEnv: env.NODE_ENV,
} as const;
