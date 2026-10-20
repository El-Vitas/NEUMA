import { describe, expect, it } from 'bun:test';
import { envSchema } from '../../../../schemas/env.schema';

describe('envSchema block editor flag', () => {
  it('is off unless it is asked for', () => {
    expect(envSchema.parse({}).NEXT_PUBLIC_BLOCK_EDITOR).toBe(false);
  });

  it('reads the text a build writes', () => {
    expect(envSchema.parse({ NEXT_PUBLIC_BLOCK_EDITOR: 'true' }).NEXT_PUBLIC_BLOCK_EDITOR).toBe(true);
    expect(envSchema.parse({ NEXT_PUBLIC_BLOCK_EDITOR: 'false' }).NEXT_PUBLIC_BLOCK_EDITOR).toBe(false);
  });
});
