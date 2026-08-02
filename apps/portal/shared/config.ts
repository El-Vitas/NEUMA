import { env } from '@/config/env.config';

export const config = {
  backendApiUrl: env.BACKEND_URL,
  nodeEnv: env.NODE_ENV,
  accessTokenMaxAgeSeconds: env.ACCESS_TOKEN_MAX_AGE_SECONDS,
} as const;

export type { Config } from './types/config.types';
