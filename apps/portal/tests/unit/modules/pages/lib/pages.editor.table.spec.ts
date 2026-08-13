import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import type { EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import { createPageTableCommand } from '@/modules/pages/lib/pages.editor.table.lib';

const cell = (text: string, type = 'table_cell'): Record<string, unknown> => ({
  content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
  type,
});

const tablePage = (headerRow: boolean): PageContent =>
  ({
    content: [
      {
        content: [
          {
            content: [
              cell('Nombre', headerRow ? 'table_header' : 'table_cell'),
              cell('Cargo', headerRow ? 'table_header' : 'table_cell'),
            ],
            type: 'table_row',
          },
          { content: [cell('Ana'), cell('Jefa')], type: 'table_row' },
        ],
        type: 'table',
      },
    ],
    schemaVersion: 1,
    type: 'doc',
  }) as PageContent;

/** The cursor in the last cell, which is the aim furthest from the header row. */
const withCursorInTheLastCell = (content: PageContent): EditorState => {
  const state = createPageEditorState(content, 'Select block');
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(state.doc.content.size), -1)));
};

const run = (content: PageContent): EditorState => {
  const state = withCursorInTheLastCell(content);
  let next = state;
  createPageTableCommand('toggleHeaderRow')(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

/** What the saved page says the first row is made of, read without trusting its shape. */
const readSavedFirstRowTypes = (saved: PageContent): readonly string[] => {
  const table: unknown = saved.content[0];
  const firstRow: unknown = isNodeList(table) ? table.content[0] : undefined;
  return isNodeList(firstRow) ? firstRow.content.map((node) => node.type) : [];
};

const isNodeList = (value: unknown): value is { readonly content: readonly { readonly type: string }[] } =>
  typeof value === 'object' && value !== null && 'content' in value && Array.isArray(value.content);

const readRowTypes = (state: EditorState, row: number): readonly string[] => {
  const rowNode = state.doc.child(0).child(row);
  return rowNode.children.map((child) => child.type.name);
};

describe('the header row of a table', () => {
  it('is made of the first row, wherever the writing happens to be', () => {
    const next = run(tablePage(false));

    expect(readRowTypes(next, 0)).toEqual(['table_header', 'table_header']);
    expect(readRowTypes(next, 1)).toEqual(['table_cell', 'table_cell']);
  });

  it('goes back to being a row like any other when asked again', () => {
    const next = run(tablePage(true));

    expect(readRowTypes(next, 0)).toEqual(['table_cell', 'table_cell']);
  });

  it('is kept when the page is saved', () => {
    const saved = serializePageEditorState(run(tablePage(false)));

    expect(readSavedFirstRowTypes(saved)).toEqual(['table_header', 'table_header']);
  });

  it('writes nothing about cells that reach exactly one row and one column', () => {
    const saved = serializePageEditorState(createPageEditorState(tablePage(true), 'Select block'));

    expect(JSON.stringify(saved)).not.toContain('colspan');
    expect(JSON.stringify(saved)).not.toContain('rowspan');
  });
});

describe('a table that says what it holds', () => {
  it('reads back from the page exactly as it was written', () => {
    const state = createPageEditorState(tablePage(true), 'Select block');

    expect(state.doc.child(0).type).toBe(pageEditorSchema.nodes.table);
    expect(state.doc.child(0).childCount).toBe(2);
  });
});
