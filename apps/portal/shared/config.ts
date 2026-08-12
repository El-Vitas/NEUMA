import { env } from '@/config/env.config';

export const config = {
  backendApiUrl: env.BACKEND_URL,
  nodeEnv: env.NODE_ENV,
} as const;
