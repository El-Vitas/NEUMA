import { z } from 'zod';

import { JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN, JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN } from '../constants/auth.constants';
import { DEFAULT_PORT, DEFAULT_PORTAL_URL } from '../constants/config.constants';
import { BCRYPT_DEFAULT_SALT_ROUNDS } from '../constants/security.constants';

export const envSchema = z
  .object({
    CORS_ORIGIN: z.string().default('http://localhost:3010,http://localhost:3020'),
    BCRYPT_SALT_ROUNDS: z
      .string()
      .default(String(BCRYPT_DEFAULT_SALT_ROUNDS))
      .transform((val) => Number.parseInt(val, 10))
      .pipe(z.number().int().positive()),
    DATABASE_URL: z.url(),
    JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default(JWT_DEFAULT_ACCESS_TOKEN_EXPIRES_IN),
    JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default(JWT_DEFAULT_REFRESH_TOKEN_EXPIRES_IN),
    JWT_SECRET: z.string().min(32),
    MCP_ACCESS_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .default(DEFAULT_PORT)
      .transform((val) => Number.parseInt(val, 10))
      .pipe(z.number().int().positive()),
    PORTAL_URL: z.url().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    TRUST_PROXY: z.string().default('false'),
  })
  /* Los enlaces que reciben los agentes se arman con esta dirección: en producción se dice siempre, en vez de suponer la de una máquina local. */
  .refine((env) => env.NODE_ENV !== 'production' || env.PORTAL_URL !== undefined, {
    message: 'PORTAL_URL must be set to the address people open the portal at in production',
    path: ['PORTAL_URL'],
  })
  .transform((env) => ({ ...env, PORTAL_URL: env.PORTAL_URL ?? DEFAULT_PORTAL_URL }));
