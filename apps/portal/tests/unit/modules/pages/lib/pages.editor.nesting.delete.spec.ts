import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import type { Command, EditorState } from 'prosemirror-state';
import { NodeSelection } from 'prosemirror-state';
import { deletePageEditorBlockKeepingChildren } from '@/modules/pages/editor/blocks/lib/pages.editor.nesting.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const pageWithANesting: PageContent = {
  content: [
    {
      content: [paragraph('Padre'), { content: [paragraph('Hijo'), paragraph('Otro hijo')], type: 'block_children' }],
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

const selectParentBlock = (state: EditorState): EditorState =>
  state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 1)));

describe('deleting the block others hang from', () => {
  it('does nothing to a block that holds no one, leaving the usual deletion to do its job', () => {
    const state = createPageEditorState(
      { content: [paragraph('Suelto')], schemaVersion: 1, type: 'doc' },
      'Select block',
    );

    expect(deletePageEditorBlockKeepingChildren(selectParentBlock(state), undefined)).toBe(false);
  });

  it('keeps the children on the page instead of taking them down with it', () => {
    const state = createPageEditorState(pageWithANesting, 'Select block');
    const afterDelete = applyCommand(selectParentBlock(state), deletePageEditorBlockKeepingChildren);

    expect(afterDelete.doc.textContent).toContain('Hijo');
    expect(afterDelete.doc.textContent).toContain('Otro hijo');
    expect(afterDelete.doc.textContent).not.toContain('Padre');
  });

  it('leaves the children as blocks of the page, not of a nesting with no head', () => {
    const state = createPageEditorState(pageWithANesting, 'Select block');
    const afterDelete = applyCommand(selectParentBlock(state), deletePageEditorBlockKeepingChildren);

    expect(afterDelete.doc.children.map((block) => block.textContent)).toEqual(['Hijo', 'Otro hijo']);
  });
});
