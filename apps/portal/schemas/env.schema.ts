import { z } from 'zod';

export const envSchema = z.object({
  BACKEND_URL: z.url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  ACCESS_TOKEN_MAX_AGE_SECONDS: z.string().default('21600').transform(Number).pipe(z.number().int().positive()),
});
