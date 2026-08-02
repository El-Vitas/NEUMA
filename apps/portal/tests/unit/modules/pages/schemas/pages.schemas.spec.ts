import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@/modules/pages/schemas/pages.schemas';

describe('pageContentSchema', () => {
  it('accepts the approved versioned block contract', () => {
    const result = pageContentSchema.safeParse({
      blocks: [{ text: 'Welcome', type: 'paragraph' }],
      schemaVersion: 1,
    });

    expect(result.success).toBe(true);
  });

  it('rejects arbitrary HTML content', () => {
    const result = pageContentSchema.safeParse({ html: '<h1>Unsafe</h1>', schemaVersion: 1 });

    expect(result.success).toBe(false);
  });
});
