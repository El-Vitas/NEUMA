import { describe, expect, test } from 'bun:test';
import {
  isPageLinkTarget,
  isPageWebAddress,
  maximumPageTextLength,
  PAGE_CONTENT_SCHEMA_VERSION,
  PAGE_DIAGRAM_FRAME_HEIGHT_LEAST,
  PAGE_DIAGRAM_FRAME_HEIGHT_MOST,
  pageContentSchema,
} from './page-content.schema.js';

describe('isPageWebAddress', () => {
  test('takes an http or https address and nothing else', () => {
    expect(isPageWebAddress('https://example.com/a')).toBe(true);
    expect(isPageWebAddress('http://example.com')).toBe(true);
    expect(isPageWebAddress('javascript:alert(1)')).toBe(false);
    expect(isPageWebAddress('mailto:ana@example.com')).toBe(false);
    expect(isPageWebAddress(null)).toBe(false);
  });
});

describe('isPageLinkTarget', () => {
  test('takes a path of this app and the addresses a page allows', () => {
    expect(isPageLinkTarget('/spaces/a/pages/b')).toBe(true);
    expect(isPageLinkTarget('https://example.com')).toBe(true);
    expect(isPageLinkTarget('mailto:ana@example.com')).toBe(true);
  });

  // Browsers strip tabs and newlines before parsing an address, so "/\t/x" becomes "//x", another site.
  test('refuses what only looks like a path of this app and leads to another site', () => {
    expect(isPageLinkTarget('//evil.example')).toBe(false);
    expect(isPageLinkTarget('/\t/evil.example')).toBe(false);
    expect(isPageLinkTarget('/\n/evil.example')).toBe(false);
    expect(isPageLinkTarget('/\r/evil.example')).toBe(false);
    expect(isPageLinkTarget('javascript:alert(1)')).toBe(false);
  });
});

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

  test('accepts a line broken on purpose inside a paragraph', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            content: [
              { text: 'Primera linea', type: 'text' },
              { type: 'hard_break' },
              { text: 'Segunda linea', type: 'text' },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a broken line standing on its own as a block', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ type: 'hard_break' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a code block that says what it is written in and how it is shown', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { language: 'typescript', wrapped: true },
            content: [{ text: 'const x = 1;', type: 'text' }],
            type: 'code_block',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('keeps how tall the frame of a drawing was made, within what a screen can show', () => {
    const withFrame = (frameHeight: number) =>
      pageContentSchema.safeParse({
        content: [
          { attrs: { frameHeight, language: 'mermaid' }, content: [{ text: 'pie', type: 'text' }], type: 'code_block' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success;

    expect(withFrame(480)).toBe(true);
    expect(withFrame(PAGE_DIAGRAM_FRAME_HEIGHT_LEAST - 1)).toBe(false);
    expect(withFrame(PAGE_DIAGRAM_FRAME_HEIGHT_MOST + 1)).toBe(false);
    expect(withFrame(480.5)).toBe(false);
  });

  test('rejects a code block written in a language this version does not know', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { language: 'brainfuck' }, content: [{ text: '+++', type: 'text' }], type: 'code_block' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a link kept as a card, with or without what was read from it', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { icon: 'https://example.com/favicon.ico', title: 'Ejemplo', url: 'https://example.com/a' },
            type: 'bookmark',
          },
          { attrs: { url: 'https://example.com/b' }, type: 'bookmark' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a card, or its icon, that leads anywhere but a web address', () => {
    const cardWith = (attrs: Record<string, string>) =>
      pageContentSchema.safeParse({ content: [{ attrs, type: 'bookmark' }], schemaVersion: 1, type: 'doc' }).success;

    expect(cardWith({ url: 'javascript:alert(1)' })).toBe(false);
    expect(cardWith({ url: 'data:text/html,<script>alert(1)</script>' })).toBe(false);
    expect(cardWith({ icon: 'javascript:alert(1)', url: 'https://example.com' })).toBe(false);
    expect(cardWith({ url: 'http://example.com' })).toBe(true);
  });

  test('rejects a card that points nowhere', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { title: 'Ejemplo' }, type: 'bookmark' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a document placed and sized where it is read', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { align: 'center', assetId: 'a', caption: 'manual.pdf', mimeType: 'application/pdf', width: 0.8 },
            type: 'file',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts a video and a recording that say how much of the page they take', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          { attrs: { assetId: 'a', width: 0.5 }, type: 'video' },
          { attrs: { assetId: 'b', caption: 'La grabación', width: 0.6 }, type: 'audio' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a player wider than the page it sits on', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { assetId: 'b', width: 1.5 }, type: 'audio' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a callout marked with one of the marks on offer', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { icon: 'warning' },
            content: [{ content: [{ text: 'Ojo', type: 'text' }], type: 'paragraph' }],
            type: 'callout',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a callout marked with anything else', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: { icon: 'unicorn' },
            content: [{ content: [{ text: 'Ojo', type: 'text' }], type: 'paragraph' }],
            type: 'callout',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a line drawn between two stretches of a page', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          { content: [{ text: 'Antes', type: 'text' }], type: 'paragraph' },
          { type: 'divider' },
          { content: [{ text: 'Despues', type: 'text' }], type: 'paragraph' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a divider holding anything, since there is nothing to write on a line', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ text: 'Algo', type: 'text' }], type: 'divider' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('refuses an image handed content instead of failing to answer', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { assetId: 'a' }, content: [{ text: 'Algo', type: 'text' }], type: 'image' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('accepts a heading remembering that it is folded', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          { attrs: { collapsed: true, level: 2 }, content: [{ text: 'Plegado', type: 'text' }], type: 'heading' },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('accepts a heading that says nothing about being folded, as every existing one does', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { level: 2 }, content: [{ text: 'Sin plegar', type: 'text' }], type: 'heading' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
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

  test('accepts a remark pointing at a fragment of the text, and the whole block wearing every mark at once', () => {
    expect(
      pageContentSchema.safeParse({
        content: [
          {
            attrs: {
              comments: [
                { author: 'Admin User', body: 'Revisar esto', createdAt: '2026-08-12T10:00:00.000Z', id: 'remark-1' },
              ],
            },
            content: [
              { text: 'Antes ', type: 'text' },
              { marks: [{ attrs: { id: 'remark-1' }, type: 'comment' }], text: 'la frase comentada', type: 'text' },
              {
                marks: [
                  { type: 'strong' },
                  { type: 'em' },
                  { type: 'code' },
                  { attrs: { href: 'https://example.com' }, type: 'link' },
                  { attrs: { id: 'remark-1' }, type: 'comment' },
                ],
                text: ' y despues',
                type: 'text',
              },
            ],
            type: 'paragraph',
          },
        ],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(true);
  });

  test('rejects a remark on the text that says nothing about which remark it is', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ content: [{ marks: [{ type: 'comment' }], text: 'Sin id', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  test('keeps a block whose type this version does not know, instead of losing the page', () => {
    const parsed = pageContentSchema.safeParse({
      content: [
        { content: [{ text: 'Antes', type: 'text' }], type: 'paragraph' },
        { attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' },
        { content: [{ text: 'Despues', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.content[1]).toEqual({
      attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' },
      type: 'diagram',
    });
  });

  // Regression: without a cap, endless nesting crashed validation instead of being rejected.
  test('refuses an unknown block nested beyond reason or carrying an endless text, without throwing', () => {
    const blockWith = (attrs: Record<string, unknown>) => ({
      content: [{ attrs, type: 'diagram' }],
      schemaVersion: 1,
      type: 'doc',
    });
    let nested: unknown = 'x';
    for (let level = 0; level < 20_000; level += 1) nested = [nested];

    expect(pageContentSchema.safeParse(blockWith({ deep: nested })).success).toBe(false);
    expect(pageContentSchema.safeParse(blockWith({ source: 'x'.repeat(maximumPageTextLength + 1) })).success).toBe(
      false,
    );
    expect(
      pageContentSchema.safeParse(blockWith({ nested: { list: [1, 'dos', null, { three: true }] } })).success,
    ).toBe(true);
  });

  test('still rejects a block it does know when it is malformed, rather than taking it as unknown', () => {
    expect(
      pageContentSchema.safeParse({
        content: [{ attrs: { level: 9 }, content: [{ text: 'Nivel imposible', type: 'text' }], type: 'heading' }],
        schemaVersion: 1,
        type: 'doc',
      }).success,
    ).toBe(false);
  });

  const markedTextThatMustBeRejected = [
    { blockType: 'code_block', markType: 'strong', name: 'a mark inside a code block', text: 'const answer = 42;' },
    {
      blockType: 'paragraph',
      markType: 'highlight',
      name: 'a mark this version does not know, which travels inside text it does read',
      text: 'Unknown mark',
    },
  ] as const;

  for (const { blockType, markType, name, text } of markedTextThatMustBeRejected) {
    test(`rejects ${name}`, () => {
      expect(
        pageContentSchema.safeParse({
          content: [{ content: [{ marks: [{ type: markType }], text, type: 'text' }], type: blockType }],
          schemaVersion: 1,
          type: 'doc',
        }).success,
      ).toBe(false);
    });
  }

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

describe('person, date, and formula nodes', () => {
  const paragraphOf = (inline: unknown) => ({
    content: [{ content: [inline], type: 'paragraph' }],
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    type: 'doc',
  });

  test('accepts a person named inside a paragraph', () => {
    expect(
      pageContentSchema.safeParse(
        paragraphOf({
          attrs: { label: 'Ada Lovelace', userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
          type: 'person',
        }),
      ).success,
    ).toBe(true);
  });

  test('rejects a person whose id is not a uuid', () => {
    expect(
      pageContentSchema.safeParse(
        paragraphOf({ attrs: { label: 'Ada Lovelace', userId: 'not-a-uuid' }, type: 'person' }),
      ).success,
    ).toBe(false);
  });

  test('rejects a person missing a label', () => {
    expect(
      pageContentSchema.safeParse(
        paragraphOf({ attrs: { userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }, type: 'person' }),
      ).success,
    ).toBe(false);
  });

  test('rejects a person carrying an attribute the contract does not know', () => {
    expect(
      pageContentSchema.safeParse(
        paragraphOf({
          attrs: { label: 'Ada Lovelace', rogue: true, userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
          type: 'person',
        }),
      ).success,
    ).toBe(false);
  });

  test('accepts a date named inside a paragraph', () => {
    expect(pageContentSchema.safeParse(paragraphOf({ attrs: { at: '2026-08-15' }, type: 'date' })).success).toBe(true);
  });

  test('rejects a date shaped wrong', () => {
    expect(pageContentSchema.safeParse(paragraphOf({ attrs: { at: '15/08/2026' }, type: 'date' })).success).toBe(false);
  });

  test('rejects a date that is not a real calendar day', () => {
    expect(pageContentSchema.safeParse(paragraphOf({ attrs: { at: '2026-02-30' }, type: 'date' })).success).toBe(false);
  });

  test('rejects a date carrying an attribute the contract does not know', () => {
    expect(
      pageContentSchema.safeParse(paragraphOf({ attrs: { at: '2026-08-15', rogue: true }, type: 'date' })).success,
    ).toBe(false);
  });

  test('accepts a formula written inside a paragraph', () => {
    expect(
      pageContentSchema.safeParse(paragraphOf({ attrs: { latex: String.raw`\frac{1}{2}` }, type: 'formula' })).success,
    ).toBe(true);
  });

  test('accepts a formula not written yet', () => {
    expect(pageContentSchema.safeParse(paragraphOf({ attrs: { latex: '' }, type: 'formula' })).success).toBe(true);
  });

  test('rejects a formula missing its latex attribute', () => {
    expect(pageContentSchema.safeParse(paragraphOf({ attrs: {}, type: 'formula' })).success).toBe(false);
  });

  test('rejects a formula carrying an attribute the contract does not know', () => {
    expect(
      pageContentSchema.safeParse(paragraphOf({ attrs: { latex: 'x', rogue: true }, type: 'formula' })).success,
    ).toBe(false);
  });
});
