import { describe, expect, test } from 'bun:test';
import { pageContentSchema } from './page-content.schema.js';

describe('pageContentSchema', () => {
  test('accepts the approved versioned block contract', () => {
    expect(
      pageContentSchema.safeParse({
        blocks: [{ text: 'Welcome', type: 'paragraph' }],
        schemaVersion: 1,
      }).success,
    ).toBe(true);
  });

  test('rejects content outside the foundation contract', () => {
    expect(pageContentSchema.safeParse({ html: '<h1>Unsafe</h1>', schemaVersion: 1 }).success).toBe(false);
  });
});
