import { describe, expect, it } from 'bun:test';
import type { PageContent } from '../schemas/page-content.schema.js';
import {
  holdPageContentThisVersionCannotRead,
  readPageDocumentJsonAsContent,
  writePageDocumentJsonAsContent,
} from './page-document.content.lib.js';

const pageWithAnUnknownBlock: PageContent = {
  content: [
    { content: [{ text: 'Antes', type: 'text' }], type: 'paragraph' },
    { attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' },
  ],
  schemaVersion: 1,
  type: 'doc',
};

describe('holdPageContentThisVersionCannotRead', () => {
  it('turns a block this version does not know into a placeholder that carries it word for word', () => {
    const held = holdPageContentThisVersionCannotRead(pageWithAnUnknownBlock);

    expect(held.content[1]).toEqual({
      attrs: {
        name: 'diagram',
        source: JSON.stringify({ attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' }),
      },
      type: 'unsupported',
    });
  });
});

describe('writePageDocumentJsonAsContent', () => {
  it('gives back the held block exactly as it arrived', () => {
    const held = holdPageContentThisVersionCannotRead(pageWithAnUnknownBlock);

    expect(writePageDocumentJsonAsContent(held)).toEqual(pageWithAnUnknownBlock);
  });

  it('leaves out the attributes that say nothing', () => {
    const documentJson = {
      content: [
        {
          attrs: { backgroundColor: null, collapsed: false, id: 'titulo', level: 2, textColor: null },
          content: [{ text: 'Título', type: 'text' }],
          type: 'heading',
        },
        {
          attrs: { backgroundColor: null, comments: null, id: null, textColor: null },
          type: 'paragraph',
        },
        {
          attrs: { frameHeight: null, id: 'codigo', language: null, shown: null, wrapped: false },
          content: [{ text: 'bun test', type: 'text' }],
          type: 'code_block',
        },
      ],
      type: 'doc',
    };

    expect(writePageDocumentJsonAsContent(documentJson)).toEqual({
      content: [
        { attrs: { id: 'titulo', level: 2 }, content: [{ text: 'Título', type: 'text' }], type: 'heading' },
        { content: [], type: 'paragraph' },
        { attrs: { id: 'codigo' }, content: [{ text: 'bun test', type: 'text' }], type: 'code_block' },
      ],
      schemaVersion: 1,
      type: 'doc',
    });
  });

  it('keeps how tall the frame of a drawing was made', () => {
    const documentJson = {
      content: [
        {
          attrs: { frameHeight: 480, id: 'diagrama', language: 'mermaid', shown: null, wrapped: false },
          content: [{ text: 'pie', type: 'text' }],
          type: 'code_block',
        },
      ],
      type: 'doc',
    };

    expect(writePageDocumentJsonAsContent(documentJson).content[0]).toEqual({
      attrs: { frameHeight: 480, id: 'diagrama', language: 'mermaid' },
      content: [{ text: 'pie', type: 'text' }],
      type: 'code_block',
    });
  });

  it('refuses a document that does not fit the stored shape', () => {
    expect(() => writePageDocumentJsonAsContent({ content: 'not blocks', type: 'doc' })).toThrow();
  });
});

describe('readPageDocumentJsonAsContent', () => {
  it('answers with nothing, instead of throwing, when the document does not fit the stored shape', () => {
    expect(readPageDocumentJsonAsContent({ content: 'not blocks', type: 'doc' })).toBeNull();
  });

  it('answers with the page when it fits', () => {
    const held = holdPageContentThisVersionCannotRead(pageWithAnUnknownBlock);

    expect(readPageDocumentJsonAsContent(held)).toEqual(pageWithAnUnknownBlock);
  });

  it('keeps a placeholder whose block is not readable as it is, instead of throwing', () => {
    const broken = { attrs: { name: 'diagram', source: '{not json' }, type: 'unsupported' };
    const document = { content: [broken], schemaVersion: 1, type: 'doc' };

    expect(readPageDocumentJsonAsContent(document)?.content).toEqual([broken]);
  });
});
