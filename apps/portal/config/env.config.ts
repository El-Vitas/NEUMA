import type { z } from 'zod';
import { envSchema, findMissingProductionVariables } from '../schemas/env.schema';

// In the browser `process.env` is empty: Next only inlines a public variable written out by its full name.
const rawEnvironment = {
  ...process.env,
  NEXT_PUBLIC_LIVE_WS_URL: process.env.NEXT_PUBLIC_LIVE_WS_URL,
};

const assertProductionVariables = (): void => {
  if (typeof window !== 'undefined') return;
  const missing = findMissingProductionVariables(rawEnvironment);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables for production: ${missing.join(', ')}`);
  }
};

assertProductionVariables();

export const env = envSchema.parse(rawEnvironment);

export type Env = z.infer<typeof envSchema>;
