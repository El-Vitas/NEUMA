import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@/modules/pages/schemas/pages.schemas';

describe('pageContentSchema', () => {
  it('accepts the approved versioned ProseMirror contract', () => {
    const result = pageContentSchema.safeParse({
      content: [{ content: [{ text: 'Welcome', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(result.success).toBe(true);
  });

  it('rejects arbitrary HTML content', () => {
    const result = pageContentSchema.safeParse({
      content: [{ content: [{ text: '<h1>Unsafe</h1>', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown ProseMirror nodes and marks', () => {
    const result = pageContentSchema.safeParse({
      content: [
        {
          content: [{ marks: [{ type: 'highlight' }], text: 'Unsafe', type: 'text' }],
          type: 'paragraph',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(result.success).toBe(false);
  });
});
