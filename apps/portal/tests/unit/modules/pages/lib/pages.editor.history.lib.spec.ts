import { describe, expect, it } from 'bun:test';
import type { EditorState, Transaction } from 'prosemirror-state';
import { redoPageEditorStep, undoPageEditorStep } from '@/modules/pages/editor/lib/pages.editor.history.lib';
import { createEmptyPageContent, createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

describe('page editor history', () => {
  it('undoes and redoes a change with the editor own history', () => {
    let state: EditorState = createPageEditorState(createEmptyPageContent(), 'Select block');
    const dispatch = (transaction: Transaction): void => {
      state = state.apply(transaction);
    };

    dispatch(state.tr.insertText('hello'));
    expect(state.doc.textContent).toBe('hello');

    expect(undoPageEditorStep(state, dispatch)).toBe(true);
    expect(state.doc.textContent).toBe('');

    expect(redoPageEditorStep(state, dispatch)).toBe(true);
    expect(state.doc.textContent).toBe('hello');
  });
});
