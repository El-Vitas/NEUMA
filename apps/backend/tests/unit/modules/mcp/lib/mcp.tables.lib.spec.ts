import { describe, expect, it } from 'bun:test';
import { type PageContent, pageContentSchema } from '@neuma/shared';
import { editMcpTable } from '@/modules/mcp/lib/mcp.tables.lib';

const page = (...content: readonly unknown[]): PageContent =>
  pageContentSchema.parse({ content, schemaVersion: 1, type: 'doc' });

const paragraph = (text: string) => ({ content: text === '' ? [] : [{ text, type: 'text' }], type: 'paragraph' });
const cell = (id: string, text: string, type = 'table_cell') => ({ attrs: { id }, content: [paragraph(text)], type });
const row = (id: string, ...cells: readonly unknown[]) => ({ attrs: { id }, content: cells, type: 'table_row' });

const content = page(
  {
    attrs: { id: 't' },
    content: [
      row('r1', cell('h1', 'Tarea', 'table_header'), cell('h2', 'Estado', 'table_header')),
      row('r2', cell('c1', 'Diseño'), cell('c2', 'Hecho')),
      row('r3', cell('c3', 'Pruebas'), cell('c4', 'Pendiente')),
    ],
    type: 'table',
  },
  { attrs: { id: 'p' }, content: [{ text: 'Nota', type: 'text' }], type: 'paragraph' },
);

const textOf = (edited: PageContent): string => JSON.stringify(edited.content[0]);

describe('editMcpTable', () => {
  it('changes one cell and keeps every other cell, row and id as it was', () => {
    const edited = editMcpTable('t', { cells: [{ column: 2, paragraph: paragraph('En curso'), row: 3 }] })(content);

    expect(edited.getValue().content[0]).toMatchObject({
      content: [
        { attrs: { id: 'r1' } },
        { attrs: { id: 'r2' } },
        {
          attrs: { id: 'r3' },
          content: [{ attrs: { id: 'c3' } }, { attrs: { id: 'c4' }, content: [paragraph('En curso')] }],
        },
      ],
    });
  });

  it('adds rows at the end, filled to the width of the table, and takes rows out', () => {
    const edited = editMcpTable('t', { addRows: [[paragraph('Deploy')]], deleteRows: [2] })(content).getValue();

    expect(textOf(edited)).not.toContain('Diseño');
    expect(edited.content[0]).toMatchObject({
      content: [
        { attrs: { id: 'r1' } },
        { attrs: { id: 'r3' } },
        { content: [{ content: [paragraph('Deploy')] }, { content: [paragraph('')] }] },
      ],
    });
  });

  it('refuses what the table cannot take, saying which', () => {
    expect(editMcpTable('t', { deleteRows: [1] })(content).getError()).toContain('header');
    expect(
      editMcpTable('t', { cells: [{ column: 3, paragraph: paragraph('x'), row: 2 }] })(content).getError(),
    ).toContain('column 3');
    expect(
      editMcpTable('t', { cells: [{ column: 1, paragraph: paragraph('x'), row: 9 }] })(content).getError(),
    ).toContain('row 9');
    expect(
      editMcpTable('t', { addRows: [[paragraph('a'), paragraph('b'), paragraph('c')]] })(content).getError(),
    ).toContain('2 columns');
    expect(editMcpTable('p', { deleteRows: [2] })(content).getError()).toContain('not a table');
  });
});
