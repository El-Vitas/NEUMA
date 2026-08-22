import { describe, expect, it } from 'bun:test';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { createPageAssetInsertCommand } from '@/modules/pages/editor/lib/pages.editor.commands';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  createPageFileDisplayCommand,
  readPageFileDisplay,
} from '@/modules/pages/editor/media/lib/pages.editor.file.display.lib';
import { createPageFileNodeView } from '@/modules/pages/editor/media/lib/pages.editor.file.node-view.lib';

const pageHolding = (attrs: Record<string, unknown>): EditorState => {
  const state = EditorState.create({
    doc: pageEditorSchema.node('doc', null, [pageEditorSchema.node('file', { assetId: 'asset-1', ...attrs })]),
    schema: pageEditorSchema,
  });
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
};

describe('how a page shows the file it holds', () => {
  /** Nobody said, so the kind of file answers: a document is read, anything else is kept. */
  it('says what the block would show today when nobody has chosen', () => {
    expect(readPageFileDisplay(pageHolding({ caption: 'manual.pdf', mimeType: 'application/pdf' }))?.chosen).toBe(
      'document',
    );
  });

  it('offers nothing for a block that is not a file', () => {
    expect(readPageFileDisplay(EditorState.create({ schema: pageEditorSchema }))).toBeNull();
  });

  it('writes the choice into the block', () => {
    const state = pageHolding({ caption: 'manual.pdf', mimeType: 'application/pdf' });
    let next = state;
    createPageFileDisplayCommand('line')(state, (transaction) => {
      next = state.apply(transaction);
    });

    expect(next.doc.child(0).attrs.display).toBe('line');
  });

  /** Offering a choice that cannot be honoured is how a menu ends up doing nothing. */
  it('offers no choice about a file the browser cannot draw', () => {
    expect(readPageFileDisplay(pageHolding({ caption: 'copia.zip', mimeType: 'application/zip' }))).toBeNull();
    expect(readPageFileDisplay(pageHolding({ caption: 'notas.txt', mimeType: 'text/plain' }))).toBeNull();
  });
});

describe('putting a file on a page that already holds one', () => {
  /** A selected block is what someone is looking at, not a hole to drop the next thing into. */
  it('puts it after the selected block instead of over it', () => {
    const state = pageHolding({ caption: 'manual.pdf', mimeType: 'application/pdf' });
    let next = state;
    createPageAssetInsertCommand(pageEditorSchema, 'file', { assetId: 'asset-2', caption: 'notas.txt' })(
      state,
      (transaction) => {
        next = state.apply(transaction);
      },
    );

    expect(next.doc.childCount).toBe(2);
    expect(next.doc.child(0).attrs.caption).toBe('manual.pdf');
    expect(next.doc.child(1).attrs.caption).toBe('notas.txt');
  });
});

describe('the block redrawing itself when the choice changes', () => {
  const nodeViewOf = (attrs: Record<string, unknown>) => {
    const node = pageEditorSchema.node('file', { assetId: 'asset-1', ...attrs });
    const container = document.createElement('div');
    const view = new EditorView(container, {
      state: EditorState.create({ doc: pageEditorSchema.node('doc', null, [node]), schema: pageEditorSchema }),
    });
    return {
      node,
      nodeView: createPageFileNodeView(
        node,
        view,
        () => 0,
        { fullScreen: 'Full screen', resize: 'Resize' },
        (assetId) => `/assets/${assetId}`,
      ),
    };
  };

  /** Saying «I handled it» to a change it cannot draw is how a block stays as it was until the page reloads. */
  it('gives the block back to be drawn again when it stops being a document', () => {
    const { node, nodeView } = nodeViewOf({ caption: 'manual.pdf', mimeType: 'application/pdf' });
    const asLine = pageEditorSchema.node('file', { ...node.attrs, display: 'line' });

    expect(nodeView.dom.dataset.pageDocument).toBe('true');
    expect(nodeView.update?.(asLine, [], null as never)).toBe(false);
  });

  it('draws a change it can draw without being rebuilt', () => {
    const { node, nodeView } = nodeViewOf({ caption: 'manual.pdf', mimeType: 'application/pdf' });
    const moved = pageEditorSchema.node('file', { ...node.attrs, align: 'center' });

    expect(nodeView.update?.(moved, [], null as never)).toBe(true);
    expect(nodeView.dom.dataset.align).toBe('center');
  });
});
