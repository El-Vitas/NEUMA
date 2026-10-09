import { describe, expect, it } from 'bun:test';
import { pageContentSchema, pageLocatorSchema, pageRestoreMutationSchema } from '@/modules/pages/schemas/pages.schemas';

const PAGE_ID = '01a10000-0000-7000-8000-000000000001';
const SPACE_ID = '01a10000-0000-7000-8000-000000000002';

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
    expect(pageLocatorSchema.safeParse({ pageId: PAGE_ID }).success).toBe(false);
    expect(pageLocatorSchema.safeParse({ pageId: PAGE_ID, spaceId: SPACE_ID }).success).toBe(true);
  });

  /** El id termina escrito en la dirección de un pedido al backend: algo que no es un id no sale de aquí. */
  it('refuses an id that is not one, a path that climbs out included', () => {
    expect(pageLocatorSchema.safeParse({ pageId: PAGE_ID, spaceId: '../../users' }).success).toBe(false);
    expect(pageLocatorSchema.safeParse({ pageId: 'page-a', spaceId: SPACE_ID }).success).toBe(false);
  });
});

describe('pageRestoreMutationSchema', () => {
  it('makes includeChildren optional', () => {
    expect(pageRestoreMutationSchema.safeParse({ pageId: PAGE_ID, spaceId: SPACE_ID }).success).toBe(true);
    expect(
      pageRestoreMutationSchema.safeParse({ includeChildren: true, pageId: PAGE_ID, spaceId: SPACE_ID }).success,
    ).toBe(true);
  });
});
