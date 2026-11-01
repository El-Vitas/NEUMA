import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { buildRemoteTransaction } from '@/modules/pages/block-sync/lib/block-sync.remote.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { documentOf, paragraph, text } from '../block-sync.fixtures';

const mount = (content: PageContent): EditorView => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return new EditorView(host, { state: createPageEditorState(content, 'Select', 'Insert') });
};

const findBlockStart = (view: EditorView, blockId: string): number => {
  let found = -1;
  view.state.doc.descendants((node, position) => {
    if (node.attrs.id === blockId) found = position;
    return found === -1;
  });
  return found;
};

const putCursor = (view: EditorView, blockId: string, offset: number): void => {
  const position = findBlockStart(view, blockId) + 1 + offset;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, position)));
};

const apply = (view: EditorView, content: PageContent): void => {
  const transaction = buildRemoteTransaction(view.state, content);
  if (transaction !== null) view.dispatch(transaction);
};

const readCursor = (view: EditorView): { readonly blockId: unknown; readonly offset: number } => {
  const { $from } = view.state.selection;
  return { blockId: $from.parent.attrs.id, offset: $from.parentOffset };
};

const original = documentOf(
  paragraph('p1', text('First paragraph')),
  paragraph('p2', text('Second paragraph')),
  paragraph('p3', text('Third paragraph')),
);

/** Changes the first and the last block, so that the replaced span holds the whole middle one too. */
const editedAtBothEnds = documentOf(
  paragraph('p1', text('First paragraph, edited')),
  paragraph('p2', text('Second paragraph')),
  paragraph('p3', text('Third paragraph, edited')),
);

describe('the selection when a remote change replaces a span that holds it', () => {
  it('stays in its block, at its offset, when the span covers several blocks', () => {
    const view = mount(original);
    putCursor(view, 'p2', 6);

    apply(view, editedAtBothEnds);

    expect(readCursor(view)).toEqual({ blockId: 'p2', offset: 6 });
    view.destroy();
  });

  it('keeps a range selection inside its block', () => {
    const view = mount(original);
    const start = findBlockStart(view, 'p2') + 1;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + 2, start + 8)));

    apply(view, editedAtBothEnds);

    const { $anchor, $head } = view.state.selection;
    expect([$anchor.parent.attrs.id, $anchor.parentOffset]).toEqual(['p2', 2]);
    expect([$head.parent.attrs.id, $head.parentOffset]).toEqual(['p2', 8]);
    view.destroy();
  });

  it('puts what is typed next in that block and not at the start of another', () => {
    const view = mount(original);
    putCursor(view, 'p2', 'Second paragraph'.length);

    apply(view, editedAtBothEnds);
    view.dispatch(view.state.tr.insertText('!'));

    expect(view.state.doc.child(1).textContent).toBe('Second paragraph!');
    expect(view.state.doc.child(0).textContent).toBe('First paragraph, edited');
    view.destroy();
  });

  it('splits the block it is in when Enter is pressed after the apply', () => {
    const view = mount(original);
    putCursor(view, 'p2', 'Second paragraph'.length);

    apply(view, editedAtBothEnds);
    view.dispatch(view.state.tr.split(view.state.selection.from));

    expect(view.state.doc.child(0).textContent).toBe('First paragraph, edited');
    expect(view.state.doc.child(1).textContent).toBe('Second paragraph');
    expect(view.state.doc.child(2).textContent).toBe('');
    view.destroy();
  });

  it('clamps the offset when the block got shorter', () => {
    const view = mount(original);
    putCursor(view, 'p2', 14);

    apply(
      view,
      documentOf(
        paragraph('p1', text('First paragraph, edited')),
        paragraph('p2', text('Short')),
        paragraph('p3', text('Third paragraph, edited')),
      ),
    );

    expect(readCursor(view)).toEqual({ blockId: 'p2', offset: 5 });
    view.destroy();
  });

  it('follows its block when the remote change moves it', () => {
    const view = mount(original);
    putCursor(view, 'p2', 4);

    apply(
      view,
      documentOf(
        paragraph('p2', text('Second paragraph')),
        paragraph('p3', text('Third paragraph, edited')),
        paragraph('p1', text('First paragraph')),
      ),
    );

    expect(readCursor(view)).toEqual({ blockId: 'p2', offset: 4 });
    view.destroy();
  });

  it('goes to the end of the nearest surviving block before it when its block is deleted', () => {
    const view = mount(original);
    putCursor(view, 'p2', 4);

    apply(
      view,
      documentOf(paragraph('p1', text('First paragraph, edited')), paragraph('p3', text('Third paragraph, edited'))),
    );

    expect(readCursor(view)).toEqual({ blockId: 'p1', offset: 'First paragraph, edited'.length });
    view.destroy();
  });

  it('goes to the start of the next block when nothing before it survives', () => {
    const view = mount(original);
    putCursor(view, 'p1', 3);

    apply(
      view,
      documentOf(paragraph('p2', text('Second paragraph, edited')), paragraph('p3', text('Third paragraph'))),
    );

    expect(readCursor(view)).toEqual({ blockId: 'p2', offset: 0 });
    view.destroy();
  });

  it('keeps a selected block selected', () => {
    const withDivider = documentOf(
      paragraph('p1', text('First paragraph')),
      { attrs: { id: 'd1' }, type: 'divider' },
      paragraph('p3', text('Third paragraph')),
    );
    const view = mount(withDivider);
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, findBlockStart(view, 'd1'))));

    apply(
      view,
      documentOf(
        paragraph('p1', text('First paragraph, edited')),
        { attrs: { id: 'd1' }, type: 'divider' },
        paragraph('p3', text('Third paragraph, edited')),
      ),
    );

    const { selection } = view.state;
    expect(selection instanceof NodeSelection ? selection.node.attrs.id : null).toBe('d1');
    view.destroy();
  });
});
