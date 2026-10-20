import type { z } from 'zod';
import { envSchema } from '../schemas/env.schema';

// In the browser `process.env` is empty: Next only inlines a public variable written out by its full name.
export const env = envSchema.parse({
  ...process.env,
  NEXT_PUBLIC_LIVE_WS_URL: process.env.NEXT_PUBLIC_LIVE_WS_URL,
});

export type Env = z.infer<typeof envSchema>;
