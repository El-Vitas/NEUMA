import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { baseKeymap } from 'prosemirror-commands';
import { undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import {
  canSplitPageEditorBlockIntoColumns,
  createPageEditorColumnDropCommand,
  findPageEditorColumnSide,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-columns.lib';
import {
  acceptsSiblingBlocks,
  findBlockStartAt,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-target.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const asPageContent = (content: PageContentNode[]): PageContent => ({ content, schemaVersion: 1, type: 'doc' });

const twoParagraphs = asPageContent([paragraph('Izquierda'), paragraph('Derecha')]);

const createState = (content: PageContent = twoParagraphs): EditorState =>
  createPageEditorState(content, 'Select block');

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const blockRangeAt = (state: EditorState, blockStart: number): { readonly from: number; readonly to: number } => {
  const block = state.doc.nodeAt(blockStart);
  if (block === null) throw new Error(`no block at ${String(blockStart)}`);
  return { from: blockStart, to: blockStart + block.nodeSize };
};

const findBlockStart = (state: EditorState, text: string): number => {
  let blockStart: number | null = null;
  state.doc.descendants((node, position) => {
    if (blockStart === null && node.type.name === 'paragraph' && node.textContent === text) blockStart = position;
  });
  if (blockStart === null) throw new Error(`paragraph "${text}" not found`);
  return blockStart;
};

const columnTexts = (state: EditorState): readonly string[] => {
  const row = state.doc.child(0);
  return row.children.map((column) => column.textContent);
};

describe('deciding when a drop splits a row into columns', () => {
  const blockRect = { left: 100, width: 400 };

  it('reads a drop hugging the left edge as a column on the left', () => {
    expect(findPageEditorColumnSide({ blockRect, clientX: 110 })).toBe('left');
  });

  it('reads a drop hugging the right edge as a column on the right', () => {
    expect(findPageEditorColumnSide({ blockRect, clientX: 490 })).toBe('right');
  });

  it('reads a drop in the middle as no column at all', () => {
    expect(findPageEditorColumnSide({ blockRect, clientX: 300 })).toBeNull();
  });

  it('still answers just outside the block, which is where a drag arrives from', () => {
    expect(findPageEditorColumnSide({ blockRect, clientX: 40 })).toBe('left');
    expect(findPageEditorColumnSide({ blockRect, clientX: 560 })).toBe('right');
  });

  it('ignores a pointer far away from the block', () => {
    expect(findPageEditorColumnSide({ blockRect, clientX: -60 })).toBeNull();
    expect(findPageEditorColumnSide({ blockRect, clientX: 700 })).toBeNull();
  });

  it('keeps the column band from swallowing a very wide block', () => {
    expect(findPageEditorColumnSide({ blockRect: { left: 0, width: 2000 }, clientX: 400 })).toBeNull();
  });
});

describe('dropping a block beside another one', () => {
  it('turns both blocks into a row of two columns', () => {
    const state = createState();
    const range = { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size };

    const split = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'right' }),
    );

    expect(split.doc.childCount).toBe(1);
    expect(split.doc.child(0).type.name).toBe('column_list');
    expect(columnTexts(split)).toEqual(['Izquierda', 'Derecha']);
  });

  it('puts the dragged block first when it is dropped on the left edge', () => {
    const state = createState();
    const range = { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size };

    const split = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'left' }),
    );

    expect(columnTexts(split)).toEqual(['Derecha', 'Izquierda']);
  });

  it('grows the row to three columns when one more block is dropped beside it', () => {
    const state = createState(asPageContent([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]));
    const firstRange = { from: findBlockStart(state, 'Dos'), to: findBlockStart(state, 'Tres') };
    const row = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range: firstRange, side: 'right' }),
    );

    const thirdStart = findBlockStart(row, 'Tres');
    const grown = applyCommand(
      row,
      createPageEditorColumnDropCommand({
        blockStart: findBlockStart(row, 'Dos'),
        copy: false,
        range: blockRangeAt(row, thirdStart),
        side: 'right',
      }),
    );

    expect(grown.doc.child(0).type.name).toBe('column_list');
    expect(columnTexts(grown)).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('refuses to drop a block beside itself', () => {
    const state = createState();
    const range = { from: 0, to: findBlockStart(state, 'Derecha') };

    const command = createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'right' });

    expect(command(state, undefined)).toBe(false);
  });

  it('undoes the split in a single step', () => {
    const state = createState();
    const range = { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size };

    const split = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'right' }),
    );
    const undone = applyCommand(split, undo);

    expect(undone.doc.children.map((block) => block.textContent)).toEqual(['Izquierda', 'Derecha']);
  });

  it('saves the row of columns with the page', () => {
    const state = createState();
    const range = { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size };

    const split = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'right' }),
    );

    expect(serializePageEditorState(split).content[0]).toMatchObject({ type: 'column_list' });
  });
});

describe('living inside a row of columns', () => {
  const splitIntoColumns = (): EditorState => {
    const state = createState();
    return applyCommand(
      state,
      createPageEditorColumnDropCommand({
        blockStart: 0,
        copy: false,
        range: { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size },
        side: 'right',
      }),
    );
  };

  const placeCursorAfter = (state: EditorState, text: string): EditorState => {
    const blockStart = findBlockStart(state, text);
    const block = state.doc.nodeAt(blockStart);
    if (block === null) throw new Error(`no block at ${String(blockStart)}`);
    return state.apply(state.tr.setSelection(TextSelection.create(state.doc, blockStart + block.nodeSize - 1)));
  };

  it('keeps what is typed inside the column it was typed in', () => {
    const row = placeCursorAfter(splitIntoColumns(), 'Izquierda');

    const written = row.apply(row.tr.insertText(' escrita'));

    expect(columnTexts(written)).toEqual(['Izquierda escrita', 'Derecha']);
  });

  it('adds a new block inside the same column when making space with Enter', () => {
    const row = placeCursorAfter(splitIntoColumns(), 'Izquierda');
    const splitBlock = baseKeymap.Enter;
    if (splitBlock === undefined) throw new Error('Enter is not bound');

    const afterEnter = applyCommand(row, splitBlock);

    expect(afterEnter.doc.childCount).toBe(1);
    expect(afterEnter.doc.child(0).child(0).childCount).toBe(2);
    expect(columnTexts(afterEnter)).toEqual(['Izquierda', 'Derecha']);
  });

  it('puts the blocks back in the page when the row is left with a single column', () => {
    const row = splitIntoColumns();
    const secondColumnStart = findBlockStart(row, 'Derecha') - 1;
    const secondColumn = row.doc.nodeAt(secondColumnStart);
    if (secondColumn === null) throw new Error('the second column is missing');

    const emptied = row.apply(row.tr.delete(secondColumnStart, secondColumnStart + secondColumn.nodeSize));

    expect(emptied.doc.childCount).toBe(1);
    expect(emptied.doc.child(0).type.name).toBe('paragraph');
    expect(emptied.doc.textContent).toBe('Izquierda');
  });

  it('drops a column once its last block is taken out of it', () => {
    const row = splitIntoColumns();
    const insideSecond = findBlockStart(row, 'Derecha');
    const block = row.doc.nodeAt(insideSecond);
    if (block === null) throw new Error('the block is missing');

    const emptied = row.apply(row.tr.delete(insideSecond, insideSecond + block.nodeSize));

    expect(emptied.doc.childCount).toBe(1);
    expect(emptied.doc.child(0).type.name).toBe('paragraph');
    expect(emptied.doc.textContent).toBe('Izquierda');
  });

  it('gives every block inside a column its own handle position', () => {
    const row = splitIntoColumns();
    const insideColumn = findBlockStart(row, 'Derecha');

    const grabbed = findBlockStartAt({
      clientY: 0,
      holdsBlocks: acceptsSiblingBlocks,
      position: insideColumn + 1,
      view: { state: row } as never,
    });

    expect(grabbed).toBe(insideColumn);
    expect(row.doc.nodeAt(insideColumn)?.textContent).toBe('Derecha');
  });

  it('keeps the columns when the page is saved and opened again', () => {
    const saved = serializePageEditorState(splitIntoColumns());

    const reopened = createPageEditorState(saved, 'Select block');

    expect(reopened.doc.child(0).type.name).toBe('column_list');
    expect(columnTexts(reopened)).toEqual(['Izquierda', 'Derecha']);
  });
});

describe('knowing where columns are allowed', () => {
  it('allows splitting a plain block of the page', () => {
    expect(canSplitPageEditorBlockIntoColumns(createState(), 0)).toBe(true);
  });

  it('refuses to split a row of columns itself', () => {
    const state = createState();
    const range = { from: findBlockStart(state, 'Derecha'), to: state.doc.content.size };
    const split = applyCommand(
      state,
      createPageEditorColumnDropCommand({ blockStart: 0, copy: false, range, side: 'right' }),
    );

    expect(canSplitPageEditorBlockIntoColumns(split, 0)).toBe(false);
  });
});
