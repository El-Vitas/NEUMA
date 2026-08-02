import { describe, expect, it } from 'bun:test';
import { DOMParser } from 'prosemirror-model';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

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
