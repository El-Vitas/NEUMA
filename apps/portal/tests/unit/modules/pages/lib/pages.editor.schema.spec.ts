import { describe, expect, it } from 'bun:test';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import { structuredEmbedNodeFixture, structuredToggleNodeFixture } from './pages.content.fixture';

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
      content: [{ content: [{ text: 'Enlace', type: 'text' }], type: 'paragraph' }],
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

    expect(document.toJSON()).toEqual({ content: structuredNodesFixture, type: 'doc' });
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
      content: [{ content: [{ text: 'Safe content', type: 'text' }], type: 'paragraph' }],
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
