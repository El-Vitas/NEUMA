import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@neuma/shared';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  changePageEditorBlockRequest,
  closePageEditorBlockRequest,
  openPageEditorBlockMenu,
  openPageEditorBlockRequest,
  readPageEditorBlockRequest,
} from '@/modules/pages/editor/blocks/lib/pages.editor.block-menu.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

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

    openPageEditorBlockRequest(view, secondBlock, 'actions');

    expect(readPageEditorBlockRequest(view.state)).toEqual({ blockStart: secondBlock, kind: 'actions' });
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

    expect(readPageEditorBlockRequest(view.state)).toEqual({ blockStart: secondBlock, kind: 'actions' });

    view.destroy();
    container.remove();
  });

  it('asks the same blocks something else without letting go of the ones chosen', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos'), paragraph('Tres')]);
    const acrossTwoBlocks = TextSelection.create(view.state.doc, 1, startOfSecondBlock(view) + 2);
    view.dispatch(view.state.tr.setSelection(acrossTwoBlocks));
    openPageEditorBlockMenu(view.state, view.dispatch);

    changePageEditorBlockRequest(view, 'handover');

    expect(readPageEditorBlockRequest(view.state)?.kind).toBe('handover');
    expect(view.state.selection.from).toBe(acrossTwoBlocks.from);
    expect(view.state.selection.to).toBe(acrossTwoBlocks.to);

    view.destroy();
    container.remove();
  });

  it('closes when asked', () => {
    const { container, view } = mountEditor([paragraph('Uno')]);
    openPageEditorBlockRequest(view, 0, 'actions');

    closePageEditorBlockRequest(view, 'actions');

    expect(readPageEditorBlockRequest(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('leaves the comments open when the menu that opened them closes behind them', () => {
    const { container, view } = mountEditor([paragraph('Uno')]);
    openPageEditorBlockRequest(view, 0, 'actions');
    openPageEditorBlockRequest(view, 0, 'comments');

    closePageEditorBlockRequest(view, 'actions');

    expect(readPageEditorBlockRequest(view.state)).toEqual({ blockStart: 0, kind: 'comments' });

    view.destroy();
    container.remove();
  });

  it('closes as soon as the page changes, so it never acts on a block that moved', () => {
    const { container, view } = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    openPageEditorBlockRequest(view, startOfSecondBlock(view), 'actions');

    view.dispatch(view.state.tr.insertText('!', 2));

    expect(readPageEditorBlockRequest(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('says nothing to open when there is no block to ask about', () => {
    const { container, view } = mountEditor([paragraph('Uno')]);

    openPageEditorBlockRequest(view, 999, 'actions');

    expect(readPageEditorBlockRequest(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });
});
