import { describe, expect, it } from 'bun:test';
import { pageContentSchema, pageLocatorSchema, pageRestoreMutationSchema } from '@/modules/pages/schemas/pages.schemas';

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

describe('pageLocatorSchema', () => {
  it('requires both pageId and spaceId', () => {
    expect(pageLocatorSchema.safeParse({ pageId: 'page-a' }).success).toBe(false);
    expect(pageLocatorSchema.safeParse({ pageId: 'page-a', spaceId: 'space-a' }).success).toBe(true);
  });
});

describe('pageRestoreMutationSchema', () => {
  it('makes includeChildren optional', () => {
    expect(pageRestoreMutationSchema.safeParse({ pageId: 'page-a', spaceId: 'space-a' }).success).toBe(true);
    expect(
      pageRestoreMutationSchema.safeParse({ includeChildren: true, pageId: 'page-a', spaceId: 'space-a' }).success,
    ).toBe(true);
  });
});
