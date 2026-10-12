import { describe, expect, it } from 'bun:test';
import { PAGE_BLOCK_COMMENTS_MOST, type PageContent, pageContentSchema } from '@neuma/shared';
import { addMcpBlockComment, removeMcpBlockComment } from '@/modules/mcp/lib/mcp.comments.lib';

const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const comment = (id: string) => ({ author: 'Ana', body: 'Revisar esto', createdAt: '2026-09-30T10:00:00.000Z', id });

const COMMENT = '11111111-1111-4111-8111-111111111111';
const commentMark = { attrs: { id: COMMENT }, type: 'comment' };

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

describe('addMcpBlockComment', () => {
  it('leaves a comment on the whole block, keeping what it says', () => {
    const edited = addMcpBlockComment('p', comment(COMMENT))(content).getValue();

    expect(edited.content[0]?.attrs).toEqual({ comments: [comment(COMMENT)], id: 'p' });
    expect(edited.content[0]).toMatchObject({ content: [{ text: 'Revisar la ' }, {}, { text: ' pronto' }] });
  });

  it('marks the words it is about, splitting only the stretch they take and keeping the marks already on them', () => {
    const edited = addMcpBlockComment('p', comment(COMMENT), 'la fecha')(content).getValue();

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

  it('finds the words on the line of a list item, and keeps the comment on the item', () => {
    const edited = addMcpBlockComment('item', comment(COMMENT), 'cliente')(content).getValue();

    expect(edited.content[1]).toMatchObject({
      content: [
        {
          attrs: { comments: [comment(COMMENT)], id: 'item' },
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
  });

  it('refuses words the block does not say, and a block with no room for another comment', () => {
    const crowded = page({
      attrs: {
        comments: Array.from({ length: PAGE_BLOCK_COMMENTS_MOST }, (_unused, at) =>
          comment(`22222222-2222-4222-8222-${String(at).padStart(12, '0')}`),
        ),
        id: 'p',
      },
      content: [{ text: 'Hola', type: 'text' }],
      type: 'paragraph',
    });

    expect(addMcpBlockComment('p', comment(COMMENT), 'mañana')(content).getError()).toContain('"mañana"');
    expect(addMcpBlockComment('p', comment(COMMENT))(crowded).getError()).toContain(String(PAGE_BLOCK_COMMENTS_MOST));
    expect(addMcpBlockComment('nada', comment(COMMENT))(content).getError()).toContain('nada');
  });
});

describe('removeMcpBlockComment', () => {
  it('takes a comment off its block and off the words it marked', () => {
    const commented = addMcpBlockComment('p', comment(COMMENT), 'pronto')(content).getValue();

    const edited = removeMcpBlockComment('p', COMMENT)(commented).getValue();

    expect(edited.content[0]?.attrs).toEqual({ id: 'p' });
    expect(JSON.stringify(edited.content[0])).not.toContain(COMMENT);
  });

  it('refuses a comment the block does not have', () => {
    expect(removeMcpBlockComment('p', COMMENT)(content).getError()).toContain(COMMENT);
  });
});
