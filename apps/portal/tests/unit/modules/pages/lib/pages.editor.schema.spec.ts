import { describe, expect, it } from 'bun:test';
import { pageContentSchema } from '@company-brain/shared';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import {
  structuredEmbedNodeFixture,
  structuredMentionNodeFixture,
  structuredToggleNodeFixture,
} from './pages.content.fixture';

const parseLink = (href: string) => {
  const documentElement = document.createElement('div');
  const paragraph = document.createElement('p');
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.textContent = 'Enlace';
  paragraph.append(link);
  documentElement.append(paragraph);

  return DOMParser.fromSchema(pageEditorSchema).parse(documentElement);
};

const serializeDocument = (document: ReturnType<typeof pageEditorSchema.nodeFromJSON>): string => {
  const documentElement = window.document.createElement('div');
  const fragment = DOMSerializer.fromSchema(pageEditorSchema).serializeFragment(document.content);
  documentElement.append(fragment);
  return documentElement.innerHTML;
};

describe('pageEditorSchema link parsing', () => {
  it('creates a link mark for an allowed protocol', () => {
    expect(parseLink('https://example.com').toJSON()).toEqual({
      content: [
        {
          attrs: { id: null },
          content: [
            { marks: [{ attrs: { href: 'https://example.com' }, type: 'link' }], text: 'Enlace', type: 'text' },
          ],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    });
  });

  it('does not create a link mark for javascript URLs', () => {
    expect(parseLink('javascript:alert(1)').toJSON()).toEqual({
      content: [{ attrs: { id: null }, content: [{ text: 'Enlace', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });
  });
});

describe('pageEditorSchema structured blocks', () => {
  it('accepts the shared table, toggle, asset, and embed node shapes', () => {
    const structuredNodesFixture = [
      {
        content: [
          {
            content: [
              { content: [{ content: [{ text: 'Cell', type: 'text' }], type: 'paragraph' }], type: 'table_cell' },
            ],
            type: 'table_row',
          },
        ],
        type: 'table',
      },
      structuredToggleNodeFixture,
      { attrs: { alt: 'Image', assetId: 'asset-1', caption: null }, type: 'image' },
      { attrs: { alt: null, assetId: 'asset-2', caption: 'File' }, type: 'file' },
      structuredEmbedNodeFixture,
    ];

    const document = pageEditorSchema.nodeFromJSON({ content: structuredNodesFixture, type: 'doc' });

    expect(document.toJSON()).toMatchObject({ content: structuredNodesFixture, type: 'doc' });
  });

  it('does not parse unsafe embed URLs into embed nodes', () => {
    const documentElement = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Safe content';
    const embed = document.createElement('div');
    embed.setAttribute('data-page-embed', 'youtube');
    embed.setAttribute('data-url', 'javascript:alert(1)');
    documentElement.append(paragraph, embed);

    expect(DOMParser.fromSchema(pageEditorSchema).parse(documentElement).toJSON()).toEqual({
      content: [{ attrs: { id: null }, content: [{ text: 'Safe content', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });
  });

  it('serializes strong, em, and code marks through DOMSerializer', () => {
    const paragraph = pageEditorSchema.nodes.paragraph.create(null, [
      pageEditorSchema.text('Strong', [pageEditorSchema.marks.strong.create()]),
      pageEditorSchema.text(' Em', [pageEditorSchema.marks.em.create()]),
      pageEditorSchema.text(' Code', [pageEditorSchema.marks.code.create()]),
    ]);
    const document = pageEditorSchema.nodes.doc.create(null, paragraph);

    expect(serializeDocument(document)).toBe('<p><strong>Strong</strong><em> Em</em><code> Code</code></p>');
  });

  it('serializes toggle content below its summary and table content in tbody', () => {
    const document = pageEditorSchema.nodeFromJSON({
      content: [
        structuredToggleNodeFixture,
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
      ],
      type: 'doc',
    });

    expect(serializeDocument(document)).toBe(
      '<details data-page-toggle="true"><summary>Details</summary><div><p>Nested</p></div></details><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>',
    );
  });
});

describe('pageEditorSchema mention node', () => {
  it('accepts a mention nested inside a paragraph and a heading, and round-trips it', () => {
    const structuredContent = {
      content: [
        {
          attrs: { id: null },
          content: [structuredMentionNodeFixture, { text: ' says hi', type: 'text' }],
          type: 'paragraph',
        },
        { attrs: { id: null, level: 2 }, content: [structuredMentionNodeFixture], type: 'heading' },
      ],
      type: 'doc',
    };

    const document = pageEditorSchema.nodeFromJSON(structuredContent);

    expect(document.toJSON()).toEqual(structuredContent);
  });

  it('does not parse a mention span missing the label attribute', () => {
    const documentElement = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Safe content';
    const mention = document.createElement('span');
    mention.setAttribute('data-page-mention', 'page-1');
    mention.setAttribute('data-space-id', 'space-1');
    documentElement.append(paragraph, mention);

    expect(DOMParser.fromSchema(pageEditorSchema).parse(documentElement).toJSON()).toEqual({
      content: [{ attrs: { id: null }, content: [{ text: 'Safe content', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });
  });

  it('does not parse a mention span missing the space id attribute', () => {
    const documentElement = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Safe content';
    const mention = document.createElement('span');
    mention.setAttribute('data-page-mention', 'page-1');
    mention.setAttribute('data-label', 'Page One');
    documentElement.append(paragraph, mention);

    expect(DOMParser.fromSchema(pageEditorSchema).parse(documentElement).toJSON()).toEqual({
      content: [{ attrs: { id: null }, content: [{ text: 'Safe content', type: 'text' }], type: 'paragraph' }],
      type: 'doc',
    });
  });

  it('rejects a mention as a top-level block in the shared contract', () => {
    const invalidContent = { content: [structuredMentionNodeFixture], schemaVersion: 1, type: 'doc' };

    expect(pageContentSchema.safeParse(invalidContent).success).toBe(false);
  });

  it('rejects a mention inside a code_block in the shared contract', () => {
    const invalidContent = {
      content: [{ content: [structuredMentionNodeFixture], type: 'code_block' }],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(pageContentSchema.safeParse(invalidContent).success).toBe(false);
  });
});

describe('pageEditorSchema block ids', () => {
  it('accepts an optional id on every block-level node and preserves it through the ProseMirror schema', () => {
    const structuredContent = {
      content: [
        { attrs: { id: 'heading-1', level: 2 }, content: [{ text: 'Título', type: 'text' }], type: 'heading' },
        { attrs: { id: 'paragraph-1' }, content: [{ text: 'Texto', type: 'text' }], type: 'paragraph' },
        { attrs: { alt: null, assetId: 'asset-1', caption: null, id: 'image-1' }, type: 'image' },
      ],
      type: 'doc',
    };

    const document = pageEditorSchema.nodeFromJSON(structuredContent);

    expect(document.toJSON()).toEqual(structuredContent);
  });

  it('still accepts a block-level node without an id, for content stored before ids existed', () => {
    const structuredContent = {
      content: [{ content: [{ text: 'Legacy', type: 'text' }], type: 'paragraph' }],
      schemaVersion: 1,
      type: 'doc',
    };

    expect(pageContentSchema.safeParse(structuredContent).success).toBe(true);
  });
});

describe('block identity in the DOM', () => {
  const renderBlock = (node: ProseMirrorNode): HTMLElement => {
    const container = document.createElement('div');
    container.appendChild(DOMSerializer.fromSchema(pageEditorSchema).serializeNode(node));
    return container;
  };

  it('exposes the block id so a block can be pointed at from the interface', () => {
    const paragraph = pageEditorSchema.nodes.paragraph.create({ id: 'block-1' }, pageEditorSchema.text('Hola'));

    expect(renderBlock(paragraph).querySelector('[data-block-id="block-1"]')).not.toBeNull();
  });

  it('omits the attribute when the block has no id yet', () => {
    const paragraph = pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text('Hola'));

    expect(renderBlock(paragraph).querySelector('[data-block-id]')).toBeNull();
  });

  it('exposes the block id on every block type, not only paragraphs', () => {
    const blocks = [
      pageEditorSchema.nodes.heading.create({ id: 'heading-1', level: 2 }, pageEditorSchema.text('Título')),
      pageEditorSchema.nodes.blockquote.create(
        { id: 'quote-1' },
        pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text('Cita')),
      ),
      pageEditorSchema.nodes.code_block.create({ id: 'code-1' }, pageEditorSchema.text('const a = 1;')),
      pageEditorSchema.nodes.bullet_list.create(
        { id: 'list-1' },
        pageEditorSchema.nodes.list_item.create(
          { id: 'item-1' },
          pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text('Punto')),
        ),
      ),
      pageEditorSchema.nodes.toggle.create(
        { id: 'toggle-1', summary: 'Detalle' },
        pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text('Dentro')),
      ),
    ];

    for (const block of blocks) {
      expect(renderBlock(block).querySelector(`[data-block-id="${String(block.attrs.id)}"]`)).not.toBeNull();
    }
  });

  it('reads the block id back when content is parsed from the DOM', () => {
    const paragraph = pageEditorSchema.nodes.paragraph.create({ id: 'block-9' }, pageEditorSchema.text('Vuelta'));
    const container = renderBlock(paragraph);

    const parsed = DOMParser.fromSchema(pageEditorSchema).parse(container);

    expect(parsed.firstChild?.attrs.id).toBe('block-9');
  });
});

describe('the default block type', () => {
  it('splits a paragraph into another paragraph, never into a code block', () => {
    const paragraph = pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text('Hola'));
    const document = pageEditorSchema.nodes.doc.create(null, paragraph);

    const defaultType = document.contentMatchAt(1).defaultType;

    expect(defaultType?.name).toBe('paragraph');
  });

  it('keeps the paragraph as the default block inside every container', () => {
    const containers = ['blockquote', 'toggle', 'table_cell', 'block_children'];

    for (const container of containers) {
      const type = pageEditorSchema.nodes[container];
      expect(type?.contentMatch.defaultType?.name).toBe('paragraph');
    }
  });
});
