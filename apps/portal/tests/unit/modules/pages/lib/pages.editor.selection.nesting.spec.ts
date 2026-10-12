import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { selectEnclosingBlock } from '@/modules/pages/editor/text/lib/pages.editor.selection.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const pageWithANesting: PageContent = {
  content: [
    {
      content: [paragraph('Padre'), { content: [paragraph('Hijo')], type: 'block_children' }],
      type: 'nested_block',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const putCursorIn = (state: EditorState, text: string): EditorState => {
  let cursor: number | null = null;
  state.doc.descendants((node, position) => {
    if (node.isText && node.text === text) cursor = position + 1;
  });
  if (cursor === null) throw new Error(`text "${text}" not found`);
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, cursor)));
};

const selectedNode = (state: EditorState) => (state.selection instanceof NodeSelection ? state.selection.node : null);

describe('selecting a block that lives in a nesting', () => {
  it('selects the block others hang from, not everything hanging from it', () => {
    const state = createPageEditorState(pageWithANesting, 'Select block');

    const selected = applyCommand(putCursorIn(state, 'Padre'), selectEnclosingBlock);

    expect(selectedNode(selected)?.type.name).toBe('paragraph');
    expect(selectedNode(selected)?.textContent).toBe('Padre');
  });

  it('selects a child on its own', () => {
    const state = createPageEditorState(pageWithANesting, 'Select block');

    const selected = applyCommand(putCursorIn(state, 'Hijo'), selectEnclosingBlock);

    expect(selectedNode(selected)?.textContent).toBe('Hijo');
  });

  it('takes the whole nesting when asked a second time', () => {
    const state = createPageEditorState(pageWithANesting, 'Select block');

    const block = applyCommand(putCursorIn(state, 'Padre'), selectEnclosingBlock);
    const nesting = applyCommand(block, selectEnclosingBlock);

    expect(selectedNode(nesting)?.type.name).toBe('nested_block');
    expect(selectedNode(nesting)?.textContent).toBe('PadreHijo');
  });

  it('has nothing further to take once the whole block of the page is selected', () => {
    const state = createPageEditorState(
      { content: [paragraph('Suelto')], schemaVersion: 1, type: 'doc' },
      'Select block',
    );

    const selected = applyCommand(putCursorIn(state, 'Suelto'), selectEnclosingBlock);

    expect(selectedNode(selected)?.textContent).toBe('Suelto');
    expect(selectEnclosingBlock(selected, undefined)).toBe(false);
  });
});
