import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import type { EditorState } from 'prosemirror-state';
import {
  acceptsSiblingBlocks,
  findBlockStartAt,
  holdsPageBlocks,
  offersGrabbableBlocks,
} from '@/modules/pages/lib/pages.editor.block-target.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const pageWithATable: PageContent = {
  content: [
    {
      content: [
        {
          content: [
            { content: [{ content: [{ text: 'Celda', type: 'text' }], type: 'paragraph' }], type: 'table_cell' },
          ],
          type: 'table_row',
        },
      ],
      type: 'table',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const createState = (content: PageContent): EditorState => createPageEditorState(content, 'Select block');

const findTextPosition = (state: EditorState, text: string): number => {
  let position: number | null = null;
  state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return position;
};

const startFrom = (state: EditorState, position: number, holdsBlocks: typeof acceptsSiblingBlocks): number | null =>
  findBlockStartAt({
    clientY: 0,
    holdsBlocks,
    position,
    view: { state } as never,
  });

describe('deciding which block a gesture is aimed at', () => {
  it('hands over the whole table when someone reaches for a block inside it', () => {
    const state = createState(pageWithATable);

    expect(startFrom(state, findTextPosition(state, 'Celda'), offersGrabbableBlocks)).toBe(0);
    expect(state.doc.nodeAt(0)?.type.name).toBe('table');
  });

  it('hands over the whole callout when someone reaches for the line written inside it', () => {
    const state = createState({
      content: [
        { content: [{ content: [{ text: 'Aviso', type: 'text' }], type: 'paragraph' }], type: 'callout' },
        { content: [{ text: 'Debajo', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(startFrom(state, findTextPosition(state, 'Aviso'), offersGrabbableBlocks)).toBe(0);
    expect(state.doc.nodeAt(0)?.type.name).toBe('callout');
  });

  it('hands over the whole quote as well, which is one block and not the lines it holds', () => {
    const state = createState({
      content: [
        { content: [{ content: [{ text: 'Citado', type: 'text' }], type: 'paragraph' }], type: 'blockquote' },
        { content: [{ text: 'Debajo', type: 'text' }], type: 'paragraph' },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    expect(startFrom(state, findTextPosition(state, 'Citado'), offersGrabbableBlocks)).toBe(0);
  });

  it('still hands over the block hanging from another one, which is moved on its own', () => {
    const state = createState({
      content: [
        {
          content: [
            { content: [{ text: 'Padre', type: 'text' }], type: 'paragraph' },
            { content: [{ content: [{ text: 'Hijo', type: 'text' }], type: 'paragraph' }], type: 'block_children' },
          ],
          type: 'nested_block',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    });
    const child = startFrom(state, findTextPosition(state, 'Hijo'), offersGrabbableBlocks);

    expect(child).not.toBe(0);
    expect(state.doc.nodeAt(child ?? 0)?.textContent).toBe('Hijo');
  });

  it('still lets a block land inside the cell, which is a different question', () => {
    const state = createState(pageWithATable);
    const insideCell = startFrom(state, findTextPosition(state, 'Celda'), acceptsSiblingBlocks);

    expect(insideCell).not.toBe(0);
    expect(state.doc.nodeAt(insideCell ?? 0)?.type.name).toBe('paragraph');
  });

  it('hands over the block itself when it sits in a column, which is moved on its own', () => {
    const state = createState({
      content: [
        {
          content: [
            { content: [{ content: [{ text: 'Izquierda', type: 'text' }], type: 'paragraph' }], type: 'column' },
            { content: [{ content: [{ text: 'Derecha', type: 'text' }], type: 'paragraph' }], type: 'column' },
          ],
          type: 'column_list',
        },
      ],
      schemaVersion: 1,
      type: 'doc',
    });

    const grabbed = startFrom(state, findTextPosition(state, 'Derecha'), offersGrabbableBlocks);

    expect(state.doc.nodeAt(grabbed ?? 0)?.textContent).toBe('Derecha');
  });

  it('hands over the block of the page when the gesture comes from its margin', () => {
    const state = createState(pageWithATable);

    expect(startFrom(state, findTextPosition(state, 'Celda'), holdsPageBlocks)).toBe(0);
  });
});
