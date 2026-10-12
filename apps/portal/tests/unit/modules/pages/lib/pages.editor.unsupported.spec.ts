import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { deletePageEditorBlocks } from '@/modules/pages/editor/blocks/lib/pages.editor.block-delete.lib';
import { createPageEditorState, serializePageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';

const pageWithAnUnknownBlock: PageContent = {
  content: [
    { content: [{ text: 'Antes', type: 'text' }], type: 'paragraph' },
    { attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' },
    { content: [{ text: 'Despues', type: 'text' }], type: 'paragraph' },
  ],
  schemaVersion: 1,
  type: 'doc',
};

const mountEditor = (content: PageContent): { readonly container: HTMLElement; readonly view: EditorView } => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, {
    state: createPageEditorState(content, 'Select block', 'Insert block', 'Block comments'),
  });
  return { container, view };
};

const closeEditor = (mounted: { readonly container: HTMLElement; readonly view: EditorView }): void => {
  mounted.view.destroy();
  mounted.container.remove();
};

describe('a page holding a block this version does not know', () => {
  it('opens, with the rest of the page where it was', () => {
    const mounted = mountEditor(pageWithAnUnknownBlock);

    expect(mounted.view.state.doc.childCount).toBe(3);
    expect(mounted.view.state.doc.child(0).textContent).toBe('Antes');
    expect(mounted.view.state.doc.child(2).textContent).toBe('Despues');

    closeEditor(mounted);
  });

  it('shows it as a block one can recognise, saying which type it is', () => {
    const mounted = mountEditor(pageWithAnUnknownBlock);

    const placeholder = mounted.container.querySelector('[data-unsupported-block]');

    expect(placeholder?.getAttribute('data-unsupported-block')).toBe('diagram');

    closeEditor(mounted);
  });

  it('writes it back exactly as it arrived, instead of dropping it', () => {
    const mounted = mountEditor(pageWithAnUnknownBlock);

    const written = serializePageEditorState(mounted.view.state);

    expect(written.content[1]).toEqual({ attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' }, type: 'diagram' });

    closeEditor(mounted);
  });

  it('can be taken off the page on purpose, like any other block', () => {
    const mounted = mountEditor(pageWithAnUnknownBlock);
    const unknownStart = mounted.view.state.doc.child(0).nodeSize;
    mounted.view.dispatch(
      mounted.view.state.tr.setSelection(NodeSelection.create(mounted.view.state.doc, unknownStart)),
    );

    deletePageEditorBlocks(mounted.view.state, mounted.view.dispatch);

    expect(mounted.view.state.doc.childCount).toBe(2);
    expect(serializePageEditorState(mounted.view.state).content).toHaveLength(2);

    closeEditor(mounted);
  });

  it('lets the rest of the page still be written in', () => {
    const mounted = mountEditor(pageWithAnUnknownBlock);
    const lastBlockStart = mounted.view.state.doc.content.size - 1;
    mounted.view.dispatch(
      mounted.view.state.tr.setSelection(TextSelection.create(mounted.view.state.doc, lastBlockStart)),
    );

    mounted.view.dispatch(mounted.view.state.tr.insertText('!'));

    expect(mounted.view.state.doc.child(2).textContent).toBe('Despues!');
    expect(serializePageEditorState(mounted.view.state).content[1]).toEqual({
      attrs: { id: 'diagrama-1', source: 'graph TD; A-->B' },
      type: 'diagram',
    });

    closeEditor(mounted);
  });
});
