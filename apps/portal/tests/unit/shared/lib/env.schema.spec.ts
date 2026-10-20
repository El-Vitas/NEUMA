import { describe, expect, it } from 'bun:test';
import { envSchema } from '../../../../schemas/env.schema';

describe('envSchema', () => {
  it('has no block editor flag: the block editor is the only editor', () => {
    const parsed = envSchema.parse({ NEXT_PUBLIC_BLOCK_EDITOR: 'false' });

    expect(Object.keys(parsed)).not.toContain('NEXT_PUBLIC_BLOCK_EDITOR');
  });

  it('keeps the socket address the browser connects to', () => {
    expect(envSchema.parse({}).NEXT_PUBLIC_LIVE_WS_URL).toBe('ws://localhost:3000/api/v1/blocks/live');
  });
});
