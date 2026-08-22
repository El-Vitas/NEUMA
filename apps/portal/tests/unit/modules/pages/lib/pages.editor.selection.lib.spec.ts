import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { AllSelection, type EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  countSelectedBlocks,
  selectBlockThenDocument,
  selectEnclosingBlock,
} from '@/modules/pages/editor/text/lib/pages.editor.selection.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const threeParagraphs: PageContent = {
  content: [paragraph('Primero'), paragraph('Segundo'), paragraph('Tercero')],
  schemaVersion: 1,
  type: 'doc',
};

const stateWithCursorInside = (text: string): EditorState => {
  const state = createPageEditorState(threeParagraphs, 'Select block');
  let cursor: number | null = null;
  state.doc.descendants((node, position) => {
    if (node.isText && node.text === text) cursor = position + 1;
  });
  if (cursor === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, cursor)));
};

const applyCommand = (state: EditorState, command: typeof selectEnclosingBlock): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

describe('selecting the block around the cursor', () => {
  it('turns a text cursor into a selection of its own block', () => {
    const selected = applyCommand(stateWithCursorInside('Segundo'), selectEnclosingBlock);

    expect(selected.selection).toBeInstanceOf(NodeSelection);
    expect((selected.selection as NodeSelection).node.textContent).toBe('Segundo');
  });

  it('leaves the neighbours untouched', () => {
    const state = stateWithCursorInside('Segundo');
    const before = state.doc.toJSON();

    const selected = applyCommand(state, selectEnclosingBlock);

    expect(selected.doc.toJSON()).toEqual(before);
  });

  it('does nothing when a block is already selected', () => {
    const selected = applyCommand(stateWithCursorInside('Segundo'), selectEnclosingBlock);

    expect(selectEnclosingBlock(selected, undefined)).toBe(false);
  });
});

describe('escalating the selection', () => {
  it('selects the block first', () => {
    const selected = applyCommand(stateWithCursorInside('Segundo'), selectBlockThenDocument);

    expect(selected.selection).toBeInstanceOf(NodeSelection);
  });

  it('selects the whole page on the second try', () => {
    const blockSelected = applyCommand(stateWithCursorInside('Segundo'), selectBlockThenDocument);

    const everything = applyCommand(blockSelected, selectBlockThenDocument);

    expect(everything.selection).toBeInstanceOf(AllSelection);
    expect(everything.doc.textContent).toBe('PrimeroSegundoTercero');
  });
});

describe('counting the selected blocks', () => {
  it('counts one for a selected block', () => {
    const selected = applyCommand(stateWithCursorInside('Segundo'), selectEnclosingBlock);

    expect(countSelectedBlocks(selected.selection)).toBe(1);
  });

  it('counts every block a text selection spans', () => {
    const state = createPageEditorState(threeParagraphs, 'Select block');
    const spanning = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)));

    expect(countSelectedBlocks(spanning.selection)).toBe(3);
  });

  it('counts nothing for a plain cursor', () => {
    expect(countSelectedBlocks(stateWithCursorInside('Segundo').selection)).toBe(1);
  });
});
