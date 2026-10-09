import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@company-brain/shared';
import { EditorView } from 'prosemirror-view';
import { createPageEditorDragGhost } from '@/modules/pages/editor/blocks/lib/pages.editor.block-drag.ghost.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const pageWithATable: PageContent = {
  content: [
    {
      content: [
        {
          content: [
            { content: [{ content: [{ text: 'Celda', type: 'text' }], type: 'paragraph' }], type: 'table_cell' },
          ],
          type: 'table_row',
        },
      ],
      type: 'table',
    },
  ],
  schemaVersion: 1,
  type: 'doc',
} as PageContent;

const mountEditor = (): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, { state: createPageEditorState(pageWithATable, 'Select block') });
  return { container, view };
};

describe('the copy of a block that follows the pointer', () => {
  // Block styling is scoped to the editor: a copy parked elsewhere renders as bare text (no table borders, list marks).
  it('is drawn where the editor says how a block looks, and not out on the page', () => {
    const { container, view } = mountEditor();

    const ghost = createPageEditorDragGhost(view, { from: 0, to: view.state.doc.content.size });
    const copy = container.querySelector('[aria-hidden="true"]');

    expect(ghost).not.toBeNull();
    expect(copy?.classList.contains('ProseMirror')).toBe(true);
    expect(copy?.querySelector('table')).not.toBeNull();

    ghost?.remove();
    view.destroy();
    container.remove();
  });

  it('is taken away when the drag ends', () => {
    const { container, view } = mountEditor();

    const ghost = createPageEditorDragGhost(view, { from: 0, to: view.state.doc.content.size });
    ghost?.remove();

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();

    view.destroy();
    container.remove();
  });
});
