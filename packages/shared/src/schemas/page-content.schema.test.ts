import { describe, expect, test } from 'bun:test';
import { PAGE_CONTENT_SCHEMA_VERSION, pageContentSchema } from './page-content.schema.js';

describe('pageContentSchema', () => {
  test('accepts an existing document with no block ids anywhere (id-less regression)', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [{ marks: [{ type: 'strong' }], text: 'Heading', type: 'text' }],
            attrs: { level: 1 },
            type: 'heading',
          },
          { content: [{ text: 'Paragraph text', type: 'text' }], type: 'paragraph' },
          {
            content: [
              { content: [{ content: [{ text: 'Item', type: 'text' }], type: 'paragraph' }], type: 'list_item' },
            ],
            type: 'bullet_list',
          },
          {
            content: [
              {
                content: [
                  {
                    content: [{ content: [{ text: 'Cell', type: 'text' }], type: 'paragraph' }],
                    type: 'table_cell',
                  },
                ],
                type: 'table_row',
              },
            ],
            type: 'table',
          },
          {
            attrs: { summary: 'Details' },
            content: [{ content: [{ text: 'Toggle body', type: 'text' }], type: 'paragraph' }],
            type: 'toggle',
          },
          { attrs: { assetId: 'asset-1' }, type: 'image' },
          { attrs: { assetId: 'asset-2' }, type: 'file' },
          { content: [{ text: 'const x = 1;', type: 'text' }], type: 'code_block' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts stable block ids on block-level nodes', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { id: 'block-1' },
            content: [{ text: 'Paragraph with id', type: 'text' }],
            type: 'paragraph',
          },
          {
            attrs: { id: 'block-2', level: 2 },
            content: [{ text: 'Heading with id', type: 'text' }],
            type: 'heading',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a block id beyond its maximum length', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { id: 'x'.repeat(201) },
            content: [{ text: 'Paragraph with an oversized id', type: 'text' }],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a mention inside a paragraph', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [
              { text: 'See ', type: 'text' },
              { attrs: { label: 'Q3 Planning', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a mention missing its target space id', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [{ attrs: { label: 'Q3 Planning', pageId: 'page-1' }, type: 'mention' }],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects a mention as a top-level block', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { label: 'Q3 Planning', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects a mention inside a code block', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [{ attrs: { label: 'Q3 Planning', pageId: 'page-1', spaceId: 'space-1' }, type: 'mention' }],
            type: 'code_block',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

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

  test('accepts tables, toggles, image/file nodes, and allowlisted embeds', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [
              {
                content: [
                  {
                    content: [{ content: [{ text: 'Cell', type: 'text' }], type: 'paragraph' }],
                    type: 'table_cell',
                  },
                ],
                type: 'table_row',
              },
            ],
            type: 'table',
          },
          {
            attrs: { summary: 'Details' },
            content: [{ content: [{ text: 'Nested content', type: 'text' }], type: 'paragraph' }],
            type: 'toggle',
          },
          { attrs: { alt: 'Preview', assetId: 'asset-1', caption: 'Caption' }, type: 'image' },
          { attrs: { alt: 'Document', assetId: 'asset-2' }, type: 'file' },
          { attrs: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' }, type: 'embed' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects malformed table and toggle nesting', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ content: [], type: 'paragraph' }], type: 'table' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { summary: 'Details' }, content: [{ type: 'image' }], type: 'toggle' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects unbounded table dimensions and metadata', () => {
    const wideRow = {
      content: Array.from({ length: 11 }, () => ({
        content: [{ content: [{ text: 'Cell', type: 'text' }], type: 'paragraph' }],
        type: 'table_cell',
      })),
      type: 'table_row',
    };
    const tallTable = {
      content: Array.from({ length: 51 }, () => ({
        content: [{ content: [{ text: 'Cell', type: 'text' }], type: 'paragraph' }],
        type: 'table_cell',
      })),
      type: 'table_row',
    };

    expect(
      pageContentSchema.safeParse({ content: [{ content: [wideRow], type: 'table' }], schemaVersion: 1, type: 'doc' })
        .success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [{ content: Array.from({ length: 51 }, () => tallTable), type: 'table' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { summary: 'x'.repeat(501) },
            content: [{ content: [{ text: 'Nested', type: 'text' }], type: 'paragraph' }],
            type: 'toggle',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('rejects unsafe embed URLs and filesystem metadata', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:text/html,unsafe',
      'file:///tmp/video',
      'https://evil.example/video',
    ]) {
      expect(
        pageContentSchema.safeParse({
          content: [{ attrs: { provider: 'youtube', url }, type: 'embed' }],
          schemaVersion: 1,
          type: 'doc',
        }).success,
      ).toBe(false);
    }
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { assetId: 'asset-1', storageKey: 'private/path' }, type: 'file' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });
});

describe('nested blocks', () => {
  const wrap = (content: unknown[]) => ({ content, schemaVersion: PAGE_CONTENT_SCHEMA_VERSION, type: 'doc' });
  const paragraph = (text: string) => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

  test('accepts a paragraph that holds another paragraph as its child', () => {
    const document = wrap([
      {
        content: [paragraph('Padre'), { content: [paragraph('Hijo')], type: 'block_children' }],
        type: 'nested_block',
      },
    ]);

    expect(pageContentSchema.safeParse(document).success).toBe(true);
  });

  test('accepts children nested several levels deep', () => {
    const document = wrap([
      {
        content: [
          paragraph('Nivel 1'),
          {
            content: [
              {
                content: [paragraph('Nivel 2'), { content: [paragraph('Nivel 3')], type: 'block_children' }],
                type: 'nested_block',
              },
            ],
            type: 'block_children',
          },
        ],
        type: 'nested_block',
      },
    ]);

    expect(pageContentSchema.safeParse(document).success).toBe(true);
  });

  test('accepts any block type as the parent, not only paragraphs', () => {
    const parents = [
      { attrs: { level: 2 }, content: [{ text: 'Encabezado', type: 'text' }], type: 'heading' },
      { content: [paragraph('Cita')], type: 'blockquote' },
      { content: [{ text: 'const a = 1;', type: 'text' }], type: 'code_block' },
    ];

    for (const parent of parents) {
      const document = wrap([
        { content: [parent, { content: [paragraph('Hijo')], type: 'block_children' }], type: 'nested_block' },
      ]);
      expect(pageContentSchema.safeParse(document).success).toBe(true);
    }
  });

  test('rejects a nested block without its children container', () => {
    const document = wrap([{ content: [paragraph('Solo')], type: 'nested_block' }]);

    expect(pageContentSchema.safeParse(document).success).toBe(false);
  });

  test('rejects a nested block whose children come before the parent', () => {
    const document = wrap([
      {
        content: [{ content: [paragraph('Hijo')], type: 'block_children' }, paragraph('Padre')],
        type: 'nested_block',
      },
    ]);

    expect(pageContentSchema.safeParse(document).success).toBe(false);
  });

  test('keeps documents written before nesting existed valid', () => {
    const document = wrap([paragraph('Contenido antiguo')]);

    expect(pageContentSchema.safeParse(document).success).toBe(true);
  });
});

describe('collection blocks', () => {
  const document = (node: unknown) => ({
    content: [node],
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  });

  test('accepts a collection sitting among the blocks of a page', () => {
    const page = {
      content: [
        { content: [{ text: 'Antes', type: 'text' }], type: 'paragraph' },
        { attrs: { pageId: 'page-1', spaceId: 'space-1' }, type: 'collection' },
        { content: [{ text: 'Después', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
      type: 'doc',
    };

    expect(pageContentSchema.safeParse(page).success).toBe(true);
  });

  test('accepts a collection that points at one of its views', () => {
    expect(
      pageContentSchema.safeParse(
        document({ attrs: { pageId: 'page-1', spaceId: 'space-1', viewName: 'Board' }, type: 'collection' }),
      ).success,
    ).toBe(true);
  });

  test('accepts a collection nested under another block', () => {
    const nested = {
      content: [
        { content: [{ text: 'Padre', type: 'text' }], type: 'paragraph' },
        { content: [{ attrs: { pageId: 'page-1', spaceId: 'space-1' }, type: 'collection' }], type: 'block_children' },
      ],
      type: 'nested_block',
    };

    expect(pageContentSchema.safeParse(document(nested)).success).toBe(true);
  });

  test('refuses a collection that does not say which page it shows', () => {
    expect(pageContentSchema.safeParse(document({ attrs: {}, type: 'collection' })).success).toBe(false);
  });

  test('refuses unknown attributes on a collection', () => {
    expect(
      pageContentSchema.safeParse(
        document({ attrs: { pageId: 'page-1', spaceId: 'space-1', rogue: true }, type: 'collection' }),
      ).success,
    ).toBe(false);
  });
});
