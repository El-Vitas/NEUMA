import { describe, expect, it } from 'bun:test';
import { envSchema } from '@/common/config/env.schema';

const required = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
};

describe('envSchema', () => {
  it('refuses to start in production without the public portal address', () => {
    expect(envSchema.safeParse({ ...required, NODE_ENV: 'production' }).success).toBe(false);
  });

  it('starts in production with the public portal address', () => {
    const parsed = envSchema.safeParse({
      ...required,
      NODE_ENV: 'production',
      PORTAL_URL: 'https://brain.example.com',
    });

    expect(parsed.success).toBe(true);
  });

  it('starts in production with whatever portal address was given, a local one included', () => {
    const parsed = envSchema.safeParse({ ...required, NODE_ENV: 'production', PORTAL_URL: 'http://localhost:3010' });

    expect(parsed.success).toBe(true);
  });

  it('keeps the local portal address outside production', () => {
    expect(envSchema.parse({ ...required, NODE_ENV: 'development' }).PORTAL_URL).toBe('http://localhost:3010');
  });
});
