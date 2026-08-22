import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { baseKeymap } from 'prosemirror-commands';
import type { Command, EditorState } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { selectBlockThenDocument } from '@/modules/pages/editor/text/lib/pages.editor.selection.lib';

const pageHoldingOnlyARow: PageContent = {
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
};

const applyCommand = (state: EditorState, command: Command): EditorState => {
  let next = state;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

const clearEverything = (state: EditorState): EditorState => {
  const deleteSelection = baseKeymap.Backspace;
  if (deleteSelection === undefined) throw new Error('Backspace is not bound');
  const selectedBlock = applyCommand(state, selectBlockThenDocument);
  const selectedPage = applyCommand(selectedBlock, selectBlockThenDocument);
  return applyCommand(selectedPage, deleteSelection);
};

describe('clearing a whole page', () => {
  it('empties a page made of plain blocks', () => {
    const state = createPageEditorState(
      {
        content: [
          { content: [{ text: 'Uno', type: 'text' }], type: 'paragraph' },
          { content: [{ text: 'Dos', type: 'text' }], type: 'paragraph' },
        ],
        schemaVersion: 1,
        type: 'doc',
      },
      'Select block',
    );

    expect(clearEverything(state).doc.textContent).toBe('');
  });

  it('empties a page whose only block is a row of columns', () => {
    const state = createPageEditorState(pageHoldingOnlyARow, 'Select block');

    const cleared = clearEverything(state);

    expect(cleared.doc.textContent).toBe('');
    expect(cleared.doc.childCount).toBe(1);
    expect(cleared.doc.child(0).type.name).toBe('paragraph');
  });
});
