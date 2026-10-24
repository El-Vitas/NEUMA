import { describe, expect, it } from 'bun:test';
import { type PageContent, pageContentSchema } from '@neuma/shared';
import { checkMcpQuote, markMcpQuote, unmarkMcpDiscussion } from '@/modules/mcp/lib/mcp.comments.lib';

const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const DISCUSSION = '11111111-1111-4111-8111-111111111111';
const commentMark = { attrs: { id: DISCUSSION }, type: 'comment' };

const content = page(
  {
    attrs: { id: 'p' },
    content: [
      { text: 'Revisar la ', type: 'text' },
      { marks: [{ type: 'strong' }], text: 'fecha de entrega', type: 'text' },
      { text: ' pronto', type: 'text' },
    ],
    type: 'paragraph',
  },
  {
    attrs: { id: 'list' },
    content: [
      {
        attrs: { id: 'item' },
        content: [{ attrs: { id: 'line' }, content: [{ text: 'Llamar al cliente', type: 'text' }], type: 'paragraph' }],
        type: 'list_item',
      },
    ],
    type: 'bullet_list',
  },
);

describe('markMcpQuote', () => {
  it('marks the words with the id of their discussion, splitting only the stretch they take and keeping the marks already on them', () => {
    const edited = markMcpQuote('p', 'la fecha', DISCUSSION)(content).getValue();

    expect(edited.content[0]).toMatchObject({
      content: [
        { text: 'Revisar ', type: 'text' },
        { marks: [commentMark], text: 'la ', type: 'text' },
        { marks: [{ type: 'strong' }, commentMark], text: 'fecha', type: 'text' },
        { marks: [{ type: 'strong' }], text: ' de entrega', type: 'text' },
        { text: ' pronto', type: 'text' },
      ],
    });
  });

  it('finds the words on the line of a list item and writes no comment into the block attributes', () => {
    const edited = markMcpQuote('item', 'cliente', DISCUSSION)(content).getValue();

    expect(edited.content[1]).toMatchObject({
      content: [
        {
          attrs: { id: 'item' },
          content: [
            {
              content: [
                { text: 'Llamar al ', type: 'text' },
                { marks: [commentMark], text: 'cliente', type: 'text' },
              ],
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(edited.content[1])).not.toContain('"comments"');
  });

  it('refuses words the block does not say and a block that does not exist', () => {
    expect(markMcpQuote('p', 'mañana', DISCUSSION)(content).getError()).toContain('"mañana"');
    expect(markMcpQuote('nada', 'hola', DISCUSSION)(content).getError()).toContain('nada');
  });
});

describe('checkMcpQuote', () => {
  it('accepts words the block says, so the discussion can be created', () => {
    expect(checkMcpQuote(content, 'p', 'la fecha').isOk()).toBe(true);
  });

  it('refuses words the block does not say before anything is created', () => {
    expect(checkMcpQuote(content, 'p', 'mañana').getError()).toContain('"mañana"');
  });
});

describe('unmarkMcpDiscussion', () => {
  it('takes the mark of a discussion off the words it marked', () => {
    const marked = markMcpQuote('p', 'pronto', DISCUSSION)(content).getValue();

    const edited = unmarkMcpDiscussion('p', DISCUSSION)(marked).getValue();

    expect(JSON.stringify(edited.content[0])).not.toContain(DISCUSSION);
    expect(JSON.stringify(edited.content[0])).toContain('pronto');
  });

  it('refuses a block that does not exist', () => {
    expect(unmarkMcpDiscussion('nada', DISCUSSION)(content).getError()).toContain('nada');
  });
});
