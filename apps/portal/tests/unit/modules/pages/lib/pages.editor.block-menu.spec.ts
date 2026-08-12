import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  closePageEditorBlockMenu,
  openPageEditorBlockMenu,
  openPageEditorBlockMenuAt,
  readPageEditorBlockMenuTarget,
} from '@/modules/pages/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/lib/pages.editor.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const mountEditor = (content: PageContentNode[]): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent: PageContent = { content, schemaVersion: 1, type: 'doc' };
  const view = new EditorView(container, { state: createPageEditorState(pageContent, 'Select block', 'Insert block') });
  return { container, view };
};

const startOfSecondBlock = (view: EditorView): number => view.state.doc.child(0).nodeSize;

const putCursorIn = (view: EditorView, blockStart: number): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, blockStart + 1)));
};

describe('asking a block what can be done to it', () => {
  it('opens the actions of the block the grip belongs to, and selects it', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    const secondBlock = startOfSecondBlock(view);

    openPageEditorBlockMenuAt(view, secondBlock);

    expect(readPageEditorBlockMenuTarget(view.state)).toBe(secondBlock);
    expect(view.state.selection instanceof NodeSelection).toBe(true);
    expect(view.state.selection.from).toBe(secondBlock);

    view.destroy();
    container.remove();
  });

  it('opens the actions of the block the cursor is in, without a pointer', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    const secondBlock = startOfSecondBlock(view);
    putCursorIn(view, secondBlock);

    openPageEditorBlockMenu(view.state, view.dispatch);

    expect(readPageEditorBlockMenuTarget(view.state)).toBe(secondBlock);

    view.destroy();
    container.remove();
  });

  it('closes when asked', () => {
    const { container, view } = mountEditor([paragraph('Uno')]);
    openPageEditorBlockMenuAt(view, 0);

    closePageEditorBlockMenu(view);

    expect(readPageEditorBlockMenuTarget(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('closes as soon as the page changes, so it never acts on a block that moved', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    openPageEditorBlockMenuAt(view, startOfSecondBlock(view));

    view.dispatch(view.state.tr.insertText('!', 2));

    expect(readPageEditorBlockMenuTarget(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('says nothing to open when there is no block to ask about', () => {
    const { container, view } = mountEditor([paragraph('Uno')]);

    openPageEditorBlockMenuAt(view, 999);

    expect(readPageEditorBlockMenuTarget(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });
});
