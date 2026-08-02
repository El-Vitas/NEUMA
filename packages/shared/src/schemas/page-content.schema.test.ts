import { describe, expect, test } from 'bun:test';
import { pageContentSchema } from './page-content.schema.js';

describe('pageContentSchema', () => {
  test('accepts a versioned ProseMirror document', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: 'Welcome', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts nested lists and blockquotes', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [
              {
                content: [{ content: [{ text: 'Nested item', type: 'text' }], type: 'paragraph' }],
                type: 'list_item',
              },
            ],
            type: 'bullet_list',
          },
          {
            content: [{ content: [{ text: 'Quoted text', type: 'text' }], type: 'paragraph' }],
            type: 'blockquote',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts headings, ordered lists, code blocks, and valid marks', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { level: 2 },
            content: [{ marks: [{ type: 'strong' }], text: 'Heading', type: 'text' }],
            type: 'heading',
          },
          { content: [{ marks: [{ type: 'code' }], text: 'inline code', type: 'text' }], type: 'paragraph' },
          {
            content: [
              {
                content: [
                  {
                    content: [
                      {
                        marks: [{ type: 'em' }, { type: 'link', attrs: { href: 'https://example.com' } }],
                        text: 'Item',
                        type: 'text',
                      },
                    ],
                    type: 'paragraph',
                  },
                ],
                type: 'list_item',
              },
            ],
            type: 'ordered_list',
          },
          { content: [{ text: 'const answer = 42;', type: 'text' }], type: 'code_block' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts plain text in code blocks', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: 'const answer = 42;', type: 'text' }], type: 'code_block' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects marks inside code blocks', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          { content: [{ marks: [{ type: 'strong' }], text: 'const answer = 42;', type: 'text' }], type: 'code_block' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects unknown node types and marks', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          { content: [{ marks: [{ type: 'highlight' }], text: 'Unknown mark', type: 'text' }], type: 'paragraph' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [{ type: 'html' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects invalid nesting', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: 'Invalid child' }], type: 'bullet_list' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ content: [], type: 'heading' }], type: 'list_item' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects invalid links and raw HTML', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [
              { marks: [{ attrs: { href: 'javascript:alert(1)' }, type: 'link' }], text: 'Unsafe link', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: '<script>alert(1)</script>', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects text and documents beyond their bounds', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: 'a'.repeat(20_001), type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);

    const excessiveNodeDocument = {
      content: Array.from({ length: 501 }, () => ({ content: [{ text: 'Node', type: 'text' }], type: 'paragraph' })),
      schemaVersion: 1,
      type: 'doc',
    };
    expect(pageContentSchema.safeParse(excessiveNodeDocument).success).toBe(false);

    let deeplyNestedNode: Record<string, unknown> = { content: [{ text: 'Deep', type: 'text' }], type: 'paragraph' };
    for (let depth = 0; depth < 12; depth += 1) {
      deeplyNestedNode = { content: [deeplyNestedNode], type: 'blockquote' };
    }
    expect(pageContentSchema.safeParse({ content: [deeplyNestedNode], schemaVersion: 1, type: 'doc' }).success).toBe(
      false,
    );
  });

  test('rejects a schema version mismatch and the old block contract', () => {
    expect(pageContentSchema.safeParse({ content: [], schemaVersion: 2, type: 'doc' }).success).toBe(false);
    expect(pageContentSchema.safeParse({ blocks: [], schemaVersion: 1 }).success).toBe(false);
  });
});
