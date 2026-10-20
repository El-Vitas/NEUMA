import { describe, expect, it } from 'bun:test';
import type { PageContent } from '@neuma/shared';
import { undo } from 'prosemirror-history';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  buildRemoteTransaction,
  contentToEditorDocument,
  isRemoteTransaction,
} from '@/modules/pages/block-sync/lib/block-sync.remote.lib';
import { createPageEditorState } from '@/modules/pages/editor/lib/pages.editor.lib';
import { documentOf, heading, paragraph, text } from '../block-sync.fixtures';

const mount = (content: PageContent): EditorView => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return new EditorView(host, { state: createPageEditorState(content, 'Select', 'Insert') });
};

const startOfParagraph = (view: EditorView, index: number): number => {
  let position = 0;
  view.state.doc.forEach((_node, offset, childIndex) => {
    if (childIndex === index) position = offset + 1;
  });
  return position;
};

const apply = (view: EditorView, content: PageContent): boolean => {
  const transaction = buildRemoteTransaction(view.state, content);
  if (transaction === null) return false;
  view.dispatch(transaction);
  return true;
};

const original = documentOf(
  paragraph('p1', text('First paragraph')),
  paragraph('p2', text('Second paragraph')),
  paragraph('p3', text('Third paragraph')),
);

describe('buildRemoteTransaction', () => {
  it('returns nothing when the document is the same', () => {
    const view = mount(original);

    expect(buildRemoteTransaction(view.state, original)).toBeNull();
  });

  it('replaces only the part that changed and ends with the document it was given', () => {
    const view = mount(original);
    const changed = documentOf(
      paragraph('p1', text('First paragraph')),
      paragraph('p2', text('Second edited paragraph')),
      paragraph('p3', text('Third paragraph')),
    );

    const transaction = buildRemoteTransaction(view.state, changed);

    expect(transaction?.steps).toHaveLength(1);
    const secondStart = startOfParagraph(view, 1);
    const secondEnd = secondStart + 'Second paragraph'.length;
    const step = transaction?.steps[0]?.toJSON();
    expect(step.from).toBeGreaterThanOrEqual(secondStart);
    expect(step.to).toBeLessThanOrEqual(secondEnd);
    expect(transaction?.doc.eq(contentToEditorDocument(changed))).toBe(true);
    view.destroy();
  });

  it('reaches the given document when blocks were added and removed', () => {
    const view = mount(original);
    const changed = documentOf(
      heading('h0', 1, 'New title'),
      paragraph('p1', text('First paragraph')),
      paragraph('p3', text('Third paragraph')),
    );

    apply(view, changed);

    expect(view.state.doc.eq(contentToEditorDocument(changed))).toBe(true);
    view.destroy();
  });

  it('marks the transaction as remote and keeps it out of the history', () => {
    const view = mount(original);
    const transaction = buildRemoteTransaction(
      view.state,
      documentOf(paragraph('p1', text('Changed')), paragraph('p2', text('Second paragraph')), paragraph('p3')),
    );

    expect(transaction === null ? false : isRemoteTransaction(transaction)).toBe(true);
    expect(transaction?.getMeta('addToHistory')).toBe(false);
    view.destroy();
  });

  it('does not mark a transaction of the writer as remote', () => {
    const view = mount(original);

    expect(isRemoteTransaction(view.state.tr.insertText('x', 1))).toBe(false);
    view.destroy();
  });

  it('keeps the cursor on the text it was on when a block above changes', () => {
    const view = mount(original);
    const cursor = startOfParagraph(view, 2) + 3;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)));
    const changed = documentOf(
      paragraph('p1', text('First paragraph, now much longer than before')),
      paragraph('p2', text('Second paragraph')),
      paragraph('p3', text('Third paragraph')),
    );

    apply(view, changed);

    const { $from } = view.state.selection;
    expect($from.parent.textContent).toBe('Third paragraph');
    expect($from.parentOffset).toBe(3);
    view.destroy();
  });

  it('keeps the cursor in place when text is inserted after it in the same block', () => {
    const view = mount(original);
    const cursor = startOfParagraph(view, 1) + 3;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)));

    apply(
      view,
      documentOf(
        paragraph('p1', text('First paragraph')),
        paragraph('p2', text('Second paragraph, extended')),
        paragraph('p3', text('Third paragraph')),
      ),
    );

    expect(view.state.selection.from).toBe(cursor);
    view.destroy();
  });

  it('moves the cursor along when text is inserted before it in the same block', () => {
    const view = mount(original);
    const cursor = startOfParagraph(view, 1) + 'Second '.length;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)));

    apply(
      view,
      documentOf(
        paragraph('p1', text('First paragraph')),
        paragraph('p2', text('The Second paragraph')),
        paragraph('p3', text('Third paragraph')),
      ),
    );

    expect(view.state.selection.$from.parent.textContent).toBe('The Second paragraph');
    expect(view.state.selection.$from.parentOffset).toBe('The Second '.length);
    view.destroy();
  });

  it('keeps the cursor inside a block whose text is replaced under it', () => {
    const view = mount(original);
    const cursor = startOfParagraph(view, 1) + 4;
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, cursor)));

    apply(
      view,
      documentOf(
        paragraph('p1', text('First paragraph')),
        paragraph('p2', text('Other words entirely')),
        paragraph('p3', text('Third paragraph')),
      ),
    );

    expect(view.state.selection.$from.parent.textContent).toBe('Other words entirely');
    view.destroy();
  });

  it('is not undone by the writer: undo takes back only the writer own change', () => {
    const view = mount(original);
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, startOfParagraph(view, 0))));
    view.dispatch(view.state.tr.insertText('Mine: '));
    apply(
      view,
      documentOf(
        paragraph('p1', text('Mine: First paragraph')),
        paragraph('p2', text('Second paragraph, by someone else')),
        paragraph('p3', text('Third paragraph')),
      ),
    );

    undo(view.state, view.dispatch);

    const [first, second] = [view.state.doc.child(0).textContent, view.state.doc.child(1).textContent];
    expect(first).toBe('First paragraph');
    expect(second).toBe('Second paragraph, by someone else');
    view.destroy();
  });

  it('does nothing to the history of the writer', () => {
    const view = mount(original);

    apply(
      view,
      documentOf(
        paragraph('p1', text('Changed by someone else')),
        paragraph('p2', text('Second paragraph')),
        paragraph('p3', text('Third paragraph')),
      ),
    );

    expect(undo(view.state, view.dispatch)).toBe(false);
    view.destroy();
  });
});
