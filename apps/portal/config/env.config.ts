import type { z } from 'zod';
import { envSchema } from '../schemas/env.schema';

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
