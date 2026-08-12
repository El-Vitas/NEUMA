import { describe, expect, it } from 'bun:test';
import type { PageContent, PageContentNode } from '@company-brain/shared';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { movePageEditorBlockDown } from '@/modules/pages/lib/pages.editor.block-move.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/lib/pages.editor.lib';
import { indentPageEditorBlock } from '@/modules/pages/lib/pages.editor.nesting.lib';

const paragraph = (text: string): PageContentNode => ({ content: [{ text, type: 'text' }], type: 'paragraph' });

const mountEditor = (content: PageContentNode[]): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent: PageContent = { content, schemaVersion: 1, type: 'doc' };
  const view = new EditorView(container, { state: createPageEditorState(pageContent, 'Select block') });
  return { container, view };
};

/** The identity of the block the text is written in, not of whatever holds it. */
const readIdOf = (view: EditorView, text: string): string | null => {
  let blockId: string | null = null;
  view.state.doc.descendants((node) => {
    if (node.isTextblock && node.textContent === text && typeof node.attrs.id === 'string') blockId ??= node.attrs.id;
  });
  return blockId;
};

const findTextPosition = (view: EditorView, text: string): number => {
  let position: number | null = null;
  view.state.doc.descendants((node, nodePosition) => {
    if (node.isText && node.text === text) position = nodePosition;
  });
  if (position === null) throw new Error(`text "${text}" not found`);
  return position;
};

const putCursorIn = (view: EditorView, text: string): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, findTextPosition(view, text) + 1)));
};

const closeEditor = (mounted: { readonly container: HTMLElement; readonly view: EditorView }): void => {
  mounted.view.destroy();
  mounted.container.remove();
};

describe('the identity a block carries', () => {
  it('is handed out to every block, once the page is being written in', () => {
    const mounted = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    mounted.view.dispatch(mounted.view.state.tr.insertText('!', 2));

    expect(readIdOf(mounted.view, 'U!no')).not.toBeNull();
    expect(readIdOf(mounted.view, 'Dos')).not.toBeNull();

    closeEditor(mounted);
  });

  it('survives writing in the block next to it', () => {
    const mounted = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    mounted.view.dispatch(mounted.view.state.tr.insertText('!', 2));
    const before = readIdOf(mounted.view, 'Dos');

    putCursorIn(mounted.view, 'U!no');
    mounted.view.dispatch(mounted.view.state.tr.insertText('X'));

    expect(readIdOf(mounted.view, 'Dos')).toBe(before);

    closeEditor(mounted);
  });

  it('survives the block being moved within the page, so a link to it still opens it', () => {
    const mounted = mountEditor([paragraph('Uno'), paragraph('Dos')]);
    mounted.view.dispatch(mounted.view.state.tr.insertText('!', 2));
    const before = readIdOf(mounted.view, 'U!no');

    putCursorIn(mounted.view, 'U!no');
    movePageEditorBlockDown(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.child(1).textContent).toBe('U!no');
    expect(readIdOf(mounted.view, 'U!no')).toBe(before);

    closeEditor(mounted);
  });

  it('survives being nested under another block', () => {
    const mounted = mountEditor([paragraph('Padre'), paragraph('Hijo')]);
    mounted.view.dispatch(mounted.view.state.tr.insertText('!', 2));
    const before = readIdOf(mounted.view, 'Hijo');

    putCursorIn(mounted.view, 'Hijo');
    indentPageEditorBlock(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.child(0).type.name).toBe('nested_block');
    expect(readIdOf(mounted.view, 'Hijo')).toBe(before);

    closeEditor(mounted);
  });

  it('is written into the page, so it is still there when it is opened again', () => {
    const mounted = mountEditor([paragraph('Uno')]);
    mounted.view.dispatch(mounted.view.state.tr.insertText('!', 2));
    const before = readIdOf(mounted.view, 'U!no');

    const reopened = createPageEditorState(serializePageEditorState(mounted.view.state), 'Select block');

    expect(reopened.doc.child(0).attrs.id).toBe(before);

    closeEditor(mounted);
  });
});
