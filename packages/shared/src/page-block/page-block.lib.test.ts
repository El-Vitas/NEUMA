import { describe, expect, it } from 'bun:test';
import { type PageContent, pageContentSchema } from '../schemas/page-content.schema.js';
import { listPageBlocks } from './page-block.lib.js';

const doc = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const text = (value: string) => ({ text: value, type: 'text' });
const paragraph = (id: string, ...content: readonly unknown[]) => ({ attrs: { id }, content, type: 'paragraph' });
const heading = (id: string, level: number, words: string) => ({
  attrs: { id, level },
  content: [text(words)],
  type: 'heading',
});

describe('listPageBlocks', () => {
  it('lists every block in the order the page reads, with what it says', () => {
    const blocks = listPageBlocks(doc(paragraph('a', text('Uno')), paragraph('b', text('Dos'))));

    expect(blocks.map((block) => [block.id, block.type, block.text, block.position, block.parentId])).toEqual([
      ['a', 'paragraph', 'Uno', 0, null],
      ['b', 'paragraph', 'Dos', 1, null],
    ]);
  });

  it('tells each block which headings it sits under, outermost first', () => {
    const blocks = listPageBlocks(
      doc(
        heading('h1', 1, 'Proyecto'),
        heading('h2', 2, 'Riesgos'),
        paragraph('p1', text('El proveedor')),
        heading('h3', 2, 'Plazos'),
        paragraph('p2', text('Marzo')),
      ),
    );

    const pathOf = (id: string) => blocks.find((block) => block.id === id)?.headingPath;
    expect(pathOf('h1')).toEqual([]);
    expect(pathOf('h2')).toEqual(['Proyecto']);
    expect(pathOf('p1')).toEqual(['Proyecto', 'Riesgos']);
    expect(pathOf('h3')).toEqual(['Proyecto']);
    expect(pathOf('p2')).toEqual(['Proyecto', 'Plazos']);
  });

  it('reads a list item by the item, since its first line is the item itself', () => {
    const item = { attrs: { id: 'item' }, content: [paragraph('line', text('Comprar pan'))], type: 'list_item' };
    const blocks = listPageBlocks(doc({ attrs: { id: 'list' }, content: [item], type: 'bullet_list' }));

    expect(blocks.map((block) => [block.id, block.text, block.parentId])).toEqual([
      ['list', '', null],
      ['item', 'Comprar pan', 'list'],
    ]);
  });

  it('keeps what hangs under a list item as blocks of their own', () => {
    const item = {
      attrs: { id: 'item' },
      content: [paragraph('line', text('Tarea')), paragraph('detail', text('Detalle'))],
      type: 'list_item',
    };
    const blocks = listPageBlocks(doc({ attrs: { id: 'list' }, content: [item], type: 'bullet_list' }));

    expect(blocks.find((block) => block.id === 'detail')).toMatchObject({ parentId: 'item', text: 'Detalle' });
  });

  it('reads a table as one block holding everything its cells say', () => {
    const cell = (words: string) => ({
      attrs: { id: `c-${words}` },
      content: [paragraph(`p-${words}`, text(words))],
      type: 'table_cell',
    });
    const row = (id: string, ...cells: readonly unknown[]) => ({ attrs: { id }, content: cells, type: 'table_row' });
    const blocks = listPageBlocks(
      doc({ attrs: { id: 't' }, content: [row('r1', cell('a'), cell('b')), row('r2', cell('c'))], type: 'table' }),
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ id: 't', text: 'a b c', type: 'table' });
  });

  it('reads what a mention, a person and a date say, the way the search already does', () => {
    const blocks = listPageBlocks(
      doc(
        paragraph(
          'p',
          text('Ver '),
          { attrs: { label: 'Plan', pageId: 'x', spaceId: 'y' }, type: 'mention' },
          text(' con '),
          { attrs: { label: 'Ana', userId: '01a10000-0000-7000-8000-0000000000a1' }, type: 'person' },
          text(' el '),
          { attrs: { at: '2026-10-01' }, type: 'date' },
        ),
      ),
    );

    expect(blocks[0]?.text).toBe('Ver Plan con Ana el 2026-10-01');
  });

  it('reads the title of a toggle as what the toggle says', () => {
    const blocks = listPageBlocks(
      doc({ attrs: { id: 't', summary: 'Ver más' }, content: [paragraph('in', text('Dentro'))], type: 'toggle' }),
    );

    expect(blocks.map((block) => [block.id, block.text, block.parentId])).toEqual([
      ['t', 'Ver más', null],
      ['in', 'Dentro', 't'],
    ]);
  });

  it('leaves out a block with no id, since nothing could point at it, but keeps what hangs inside', () => {
    const blocks = listPageBlocks(
      doc({ content: [paragraph('inside', text('Dentro'))], type: 'blockquote' }, paragraph('after', text('Fuera'))),
    );

    expect(blocks.map((block) => [block.id, block.parentId])).toEqual([
      ['inside', null],
      ['after', null],
    ]);
  });
});
