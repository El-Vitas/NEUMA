import { describe, expect, test } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs';
import {
  encodePageContentAsCollaborationState,
  readCollaborationDocumentContent,
  replaceCollaborationDocumentContent,
} from '../../../../../src/modules/collaboration/utils/collaboration.document.utils';

const richPage: PageContent = {
  content: [
    {
      attrs: { id: 'titulo', level: 2 },
      content: [{ text: 'Cómo desplegamos', type: 'text' }],
      type: 'heading',
    },
    {
      attrs: { id: 'parrafo' },
      content: [
        { text: 'Lee ', type: 'text' },
        { marks: [{ attrs: { href: 'https://example.com' }, type: 'link' }], text: 'la guía', type: 'text' },
        { text: ' y ', type: 'text' },
        { marks: [{ type: 'em' }, { type: 'strong' }], text: 'no saltes pasos', type: 'text' },
        { text: ', como dice ', type: 'text' },
        {
          attrs: {
            label: 'Guía',
            pageId: '019ffc24-f641-739d-bc50-284c896476fc',
            spaceId: '22222222-2222-4222-8222-222222222222',
          },
          type: 'mention',
        },
      ],
      type: 'paragraph',
    },
    {
      attrs: { icon: 'warning', id: 'aviso' },
      content: [{ attrs: { id: 'dentro' }, content: [{ text: 'Cuidado', type: 'text' }], type: 'paragraph' }],
      type: 'callout',
    },
    {
      attrs: { id: 'tabla' },
      content: [
        {
          attrs: { id: 'fila' },
          content: [
            {
              attrs: { colspan: 2, id: 'celda' },
              content: [
                { attrs: { id: 'texto-celda' }, content: [{ text: 'Ancha', type: 'text' }], type: 'paragraph' },
              ],
              type: 'table_header',
            },
          ],
          type: 'table_row',
        },
      ],
      type: 'table',
    },
    { attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const readBack = (content: PageContent): PageContent => {
  const document = new Doc();
  applyUpdate(document, encodePageContentAsCollaborationState(content));
  return readCollaborationDocumentContent(document);
};

describe('collaboration document', () => {
  test('gives back exactly the page it was seeded with', () => {
    expect(readBack(richPage)).toEqual(richPage);
  });

  test('keeps a block this version does not know, word for word', () => {
    expect(readBack(richPage).content.at(-1)).toEqual({
      attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' },
      type: 'diagram',
    });
  });

  test('gives back an empty page as an empty page', () => {
    const emptyPage: PageContent = { content: [{ content: [], type: 'paragraph' }], schemaVersion: 1, type: 'doc' };

    expect(readBack(emptyPage)).toEqual(emptyPage);
  });
});

const paragraph = (id: string, text: string): PageContent['content'][number] => ({
  attrs: { id },
  content: [{ text, type: 'text' }],
  type: 'paragraph',
});

const pageOf = (...blocks: PageContent['content']): PageContent => ({ content: blocks, schemaVersion: 1, type: 'doc' });

const syncBothWays = (left: Doc, right: Doc): void => {
  applyUpdate(left, encodeStateAsUpdate(right));
  applyUpdate(right, encodeStateAsUpdate(left));
};

describe('replaceCollaborationDocumentContent', () => {
  test('leaves the document saying exactly the new content', () => {
    const document = new Doc();
    applyUpdate(document, encodePageContentAsCollaborationState(pageOf(paragraph('a', 'Uno'))));

    replaceCollaborationDocumentContent(document, pageOf(paragraph('a', 'Uno'), paragraph('b', 'Dos')));

    expect(readCollaborationDocumentContent(document)).toEqual(pageOf(paragraph('a', 'Uno'), paragraph('b', 'Dos')));
  });

  test('merges with what somebody is writing at the same time in another block', () => {
    const seed = encodePageContentAsCollaborationState(pageOf(paragraph('a', 'Uno'), paragraph('b', 'Dos')));
    const server = new Doc();
    const person = new Doc();
    applyUpdate(server, seed);
    applyUpdate(person, seed);

    replaceCollaborationDocumentContent(
      server,
      pageOf(paragraph('a', 'Uno'), paragraph('b', 'Dos'), paragraph('c', 'Del agente')),
    );
    replaceCollaborationDocumentContent(person, pageOf(paragraph('a', 'Uno editado'), paragraph('b', 'Dos')));
    syncBothWays(server, person);

    const expected = pageOf(paragraph('a', 'Uno editado'), paragraph('b', 'Dos'), paragraph('c', 'Del agente'));
    expect(readCollaborationDocumentContent(server)).toEqual(expected);
    expect(readCollaborationDocumentContent(person)).toEqual(expected);
  });
});
