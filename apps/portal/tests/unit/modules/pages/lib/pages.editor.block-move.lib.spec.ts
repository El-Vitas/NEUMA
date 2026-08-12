import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { undo } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { movePageEditorBlockDown, movePageEditorBlockUp } from '@/modules/pages/lib/pages.editor.block-move.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const asPageContent = (content: PageContentNode[]): PageContent => ({ content, schemaVersion: 1, type: 'doc' });

const threeParagraphs = asPageContent([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]);

const createState = (content: PageContent = threeParagraphs): EditorState =>
  createPageEditorState(content, 'Select block');

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const blockTexts = (state: EditorState): readonly string[] => state.doc.children.map((block) => block.textContent);

const putCursorIn = (state: EditorState, text: string): EditorState => {
  let cursor: number | null = null;
  state.doc.descendants((node, position) => {
    if (node.isText && node.text === text) cursor = position + 1;
  });
  if (cursor === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, cursor)));
};

describe('moving the block the cursor is in', () => {
  it('lifts it above the one before it', () => {
    const state = putCursorIn(createState(), 'Dos');

    expect(blockTexts(applyCommand(state, movePageEditorBlockUp))).toEqual(['Dos', 'Uno', 'Tres']);
  });

  it('drops it below the one after it', () => {
    const state = putCursorIn(createState(), 'Dos');

    expect(blockTexts(applyCommand(state, movePageEditorBlockDown))).toEqual(['Uno', 'Tres', 'Dos']);
  });

  it('carries the cursor with the block, so it can be moved again', () => {
    const state = putCursorIn(createState(), 'Tres');

    const moved = applyCommand(applyCommand(state, movePageEditorBlockUp), movePageEditorBlockUp);

    expect(blockTexts(moved)).toEqual(['Tres', 'Uno', 'Dos']);
  });

  it('refuses to lift the first block or drop the last one', () => {
    const state = createState();

    expect(movePageEditorBlockUp(putCursorIn(state, 'Uno'), undefined)).toBe(false);
    expect(movePageEditorBlockDown(putCursorIn(state, 'Tres'), undefined)).toBe(false);
  });

  it('undoes the move in a single step', () => {
    const state = putCursorIn(createState(), 'Dos');

    const moved = applyCommand(state, movePageEditorBlockUp);

    expect(blockTexts(applyCommand(moved, undo))).toEqual(['Uno', 'Dos', 'Tres']);
  });
});

describe('moving several selected blocks', () => {
  const findTextPosition = (state: EditorState, text: string): number => {
    let position: number | null = null;
    state.doc.descendants((node, nodePosition) => {
      if (node.isText && node.text === text) position = nodePosition;
    });
    if (position === null) throw new Error(`text "${text}" not found`);
    return position;
  };

  const selectFromTo = (state: EditorState, fromText: string, toText: string): EditorState =>
    state.apply(
      state.tr.setSelection(
        TextSelection.create(state.doc, findTextPosition(state, fromText), findTextPosition(state, toText) + 1),
      ),
    );

  it('lifts them together, keeping their order', () => {
    const state = selectFromTo(createState(), 'Uno', 'Dos');

    expect(blockTexts(applyCommand(state, movePageEditorBlockDown))).toEqual(['Tres', 'Uno', 'Dos']);
  });

  it('moves them as one block of the page, not one at a time', () => {
    const state = createState(
      asPageContent([paragraph('Uno'), paragraph('Dos'), paragraph('Tres'), paragraph('Cuatro')]),
    );

    const spanning = selectFromTo(state, 'Dos', 'Tres');

    expect(blockTexts(applyCommand(spanning, movePageEditorBlockUp))).toEqual(['Dos', 'Tres', 'Uno', 'Cuatro']);
  });
});

describe('moving a block that lives inside another one', () => {
  it('moves it among its own neighbours, staying where it belongs', () => {
    const state = createState(
      asPageContent([
        {
          content: [
            { content: [paragraph('Arriba'), paragraph('Abajo')], type: 'column' },
            { content: [paragraph('Otra columna')], type: 'column' },
          ],
          type: 'column_list',
        },
      ]),
    );

    const moved = applyCommand(putCursorIn(state, 'Abajo'), movePageEditorBlockUp);
    const firstColumn = moved.doc.child(0).child(0);

    expect(firstColumn.children.map((block) => block.textContent)).toEqual(['Abajo', 'Arriba']);
    expect(moved.doc.child(0).childCount).toBe(2);
  });
});
