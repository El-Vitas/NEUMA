import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envPath = resolve(process.cwd(), '.env.test');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replaceAll(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const testEnvSchema = z.object({
  TEST_DATABASE_ADMIN_URL: z.url(),
  TEST_DATABASE_URL: z.url(),
});

type TestEnv = z.infer<typeof testEnvSchema>;

const result = testEnvSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Invalid test env: ${result.error.message}`);
}

export const testEnv: TestEnv = result.data;
