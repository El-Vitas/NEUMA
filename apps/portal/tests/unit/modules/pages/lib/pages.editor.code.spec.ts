import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import type { EditorState } from 'prosemirror-state';
import { TextSelection } from 'prosemirror-state';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import {
  indentPageEditorCode,
  outdentPageEditorCode,
} from '@/modules/pages/editor/structure/lib/pages.editor.code.lib';

const codePage = (code: string): PageContent =>
  ({
    content: [{ content: [{ text: code, type: 'text' }], type: 'code_block' }],
    schemaVersion: 1,
    type: 'doc',
  }) as PageContent;

const paragraphPage: PageContent = {
  content: [{ content: [{ text: 'Suelto', type: 'text' }], type: 'paragraph' }],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const withCursorAtTheEnd = (content: PageContent): EditorState => {
  const state = createPageEditorState(content, 'Select block');
  return state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(state.doc.content.size), -1)));
};

const press = (
  command: (state: EditorState, dispatch?: (transaction: EditorState['tr']) => void) => boolean,
  content: PageContent,
): EditorState | null => {
  const state = withCursorAtTheEnd(content);
  let next: EditorState | null = null;
  command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return next;
};

describe('Tab inside a code block', () => {
  it('indents the code rather than leaving the page', () => {
    const next = press(indentPageEditorCode, codePage('const x = 1;'));
    if (next === null) throw new Error('Tab left the code untouched');

    expect(next.doc.child(0).textContent).toBe('const x = 1;  ');
  });

  it('says nothing outside a code block, where Tab means nesting', () => {
    expect(press(indentPageEditorCode, paragraphPage)).toBeNull();
  });
});

describe('Shift+Tab inside a code block', () => {
  it('takes back a step of indentation', () => {
    const next = press(outdentPageEditorCode, codePage('    const x = 1;'));
    if (next === null) throw new Error('Shift+Tab left the code untouched');

    expect(next.doc.child(0).textContent).toBe('  const x = 1;');
  });

  it('leaves a line that is already at the margin alone', () => {
    expect(press(outdentPageEditorCode, codePage('const x = 1;'))).toBeNull();
  });

  it('says nothing outside a code block', () => {
    expect(press(outdentPageEditorCode, paragraphPage)).toBeNull();
  });
});
