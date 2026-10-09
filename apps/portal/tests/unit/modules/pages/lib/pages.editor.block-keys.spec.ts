import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({
  content: text.length === 0 ? [] : [{ text, type: 'text' }],
  type: 'paragraph',
});

const mountEditor = (content: PageContentNode[]): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent: PageContent = { content, schemaVersion: 1, type: 'doc' };
  const view = new EditorView(container, { state: createPageEditorState(pageContent, 'Select block', 'Insert block') });
  return { container, view };
};

const putCursorAt = (view: EditorView, position: number): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, position)));
};

const pressKey = (view: EditorView, key: string, options: KeyboardEventInit = {}): void => {
  view.dom.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...options }));
};

const describeBlocks = (view: EditorView): unknown =>
  view.state.doc.children.map((block) => ({ text: block.textContent, type: block.type.name }));

const startOfSecondBlock = (view: EditorView): number => view.state.doc.child(0).nodeSize + 1;

describe('the keys that remove a block', () => {
  it('deletes an empty block and takes the cursor up to the one before it', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('')]);
    putCursorAt(view, startOfSecondBlock(view));

    pressKey(view, 'Backspace');

    expect(describeBlocks(view)).toEqual([{ text: 'Uno', type: 'paragraph' }]);
    expect(view.state.selection.from).toBe(view.state.doc.child(0).nodeSize - 1);

    view.destroy();
    container.remove();
  });

  it('removes the selected blocks with the delete shortcut, wherever the cursor sits', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    putCursorAt(view, 2);

    pressKey(view, 'Backspace', { ctrlKey: true, shiftKey: true });

    expect(describeBlocks(view)).toEqual([{ text: 'Dos', type: 'paragraph' }]);

    view.destroy();
    container.remove();
  });
});

describe('the key that duplicates a block', () => {
  it('leaves the copy right below the original', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    putCursorAt(view, 2);

    pressKey(view, 'd', { ctrlKey: true });

    expect(describeBlocks(view)).toEqual([
      { text: 'Uno', type: 'paragraph' },
      { text: 'Uno', type: 'paragraph' },
      { text: 'Dos', type: 'paragraph' },
    ]);

    view.destroy();
    container.remove();
  });
});
