import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { PAGE_EDITOR_BLOCK_HANDLE_CLASS } from '@/modules/pages/editor/blocks/constants/pages.editor.blocks.constants';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { pageEditorBlockHandleKey } from '@/modules/pages/editor/lib/pages.editor.plugin-keys.lib';

const twoBlockContent: PageContent = {
  content: [
    { content: [{ text: 'Primero', type: 'text' }], type: 'paragraph' },
    { content: [{ text: 'Segundo', type: 'text' }], type: 'paragraph' },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const mountEditor = (): { view: EditorView; container: HTMLElement } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, { state: createPageEditorState(twoBlockContent, 'Select block') });
  return { container, view };
};

const hoverBlock = (view: EditorView, text: string): void => {
  let position: number | null = null;
  view.state.doc.descendants((node, nodePosition) => {
    if (node.isTextblock && node.textContent === text) position = nodePosition;
  });
  if (position === null) throw new Error(`block "${text}" not rendered`);
  view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, position));
};

const findHandle = (container: HTMLElement): HTMLElement | null =>
  container.querySelector(`.${PAGE_EDITOR_BLOCK_HANDLE_CLASS}`);

describe('block handle', () => {
  it('shows no handle until a block is hovered', () => {
    const { container, view } = mountEditor();

    expect(findHandle(container)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('shows a handle for the hovered block', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Primero');

    const handle = findHandle(container);
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-drag-handle')).toBe('true');
    expect(handle?.getAttribute('aria-label')).toBe('Select block');

    view.destroy();
    container.remove();
  });

  it('stays out of the tab order so it cannot swallow the indent key', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Primero');

    expect(findHandle(container)?.tabIndex).toBe(-1);

    view.destroy();
    container.remove();
  });

  it('moves the handle to whichever block is hovered', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Primero');
    const firstPosition = pageEditorBlockHandleKey.getState(view.state);
    hoverBlock(view, 'Segundo');
    const secondPosition = pageEditorBlockHandleKey.getState(view.state);

    expect(firstPosition).toBe(0);
    expect(secondPosition).not.toBe(firstPosition);

    view.destroy();
    container.remove();
  });

  it('selects only the hovered block, leaving its neighbour untouched', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Segundo');
    findHandle(container)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    const selection = view.state.selection;
    const hoveredPosition = pageEditorBlockHandleKey.getState(view.state);
    expect(selection).toBeInstanceOf(NodeSelection);
    expect(hoveredPosition).not.toBeNull();
    expect(selection.from).toBe(Number(hoveredPosition));
    expect((selection as NodeSelection).node.textContent).toBe('Segundo');
    expect(view.state.doc.childCount).toBe(2);

    view.destroy();
    container.remove();
  });

  it('shows a handle for a block with nothing inside, such as an image', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const view = new EditorView(container, {
      state: createPageEditorState(
        {
          content: [
            { attrs: { assetId: 'asset-1' }, type: 'image' },
            { content: [], type: 'paragraph' },
          ],
          schemaVersion: 1,
          type: 'doc',
        },
        'Select block',
      ),
    });

    view.dispatch(view.state.tr.setMeta(pageEditorBlockHandleKey, 0));

    expect(findHandle(container)).not.toBeNull();
    expect(view.state.doc.child(0).type.name).toBe('image');

    view.destroy();
    container.remove();
  });

  it('forgets the hovered block when the page changes, so the handle never lands inside the text', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Primero');
    view.dispatch(view.state.tr.insertText('!', 3));

    expect(pageEditorBlockHandleKey.getState(view.state)).toBeNull();
    expect(findHandle(container)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('hides the handle when the pointer leaves the editor', () => {
    const { container, view } = mountEditor();

    hoverBlock(view, 'Primero');
    container.querySelector('.ProseMirror')?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    expect(pageEditorBlockHandleKey.getState(view.state)).toBeNull();

    view.destroy();
    container.remove();
  });

  it('keeps the document unchanged when a block is selected', () => {
    const { container, view } = mountEditor();
    const before = view.state.doc.toJSON();

    hoverBlock(view, 'Primero');
    findHandle(container)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(view.state.doc.toJSON()).toEqual(before);

    view.destroy();
    container.remove();
  });
});
