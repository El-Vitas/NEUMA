import { describe, expect, it } from 'bun:test';
import { TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { applyUpdate, Doc } from 'yjs';
import { PAGE_EDITOR_COMMANDS } from '@/modules/pages/editor/constants/pages.editor.constants';
import { createCollaborativePageEditorState } from '@/modules/pages/lib/pages.collaboration.lib';

/** Two people on the same page, each with their own copy, telling each other what they wrote. */
const openTogether = (): { readonly first: EditorView; readonly second: EditorView; readonly close: () => void } => {
  const firstDocument = new Doc();
  const secondDocument = new Doc();
  firstDocument.on('update', (update: Uint8Array) => applyUpdate(secondDocument, update, 'remote'));
  secondDocument.on('update', (update: Uint8Array) => applyUpdate(firstDocument, update, 'remote'));

  const mount = (document_: Doc): EditorView => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    return new EditorView(container, {
      state: createCollaborativePageEditorState(
        { awareness: null, fragment: document_.getXmlFragment('page') },
        'Select block',
        'Insert block',
      ),
    });
  };

  const first = mount(firstDocument);
  const second = mount(secondDocument);
  return {
    close: () => {
      first.destroy();
      second.destroy();
      firstDocument.destroy();
      secondDocument.destroy();
    },
    first,
    second,
  };
};

const writeAtTheEnd = (view: EditorView, text: string): void => {
  const end = view.state.doc.content.size;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, Math.max(end - 1, 0))));
  view.dispatch(view.state.tr.insertText(text));
};

describe('undoing while someone else is writing on the same page', () => {
  it('takes back only what this person wrote', () => {
    const together = openTogether();
    writeAtTheEnd(together.first, 'Mio');
    writeAtTheEnd(together.second, 'Suyo');

    PAGE_EDITOR_COMMANDS.undo.run(together.first.state, together.first.dispatch);

    expect(together.first.state.doc.textContent).not.toContain('Mio');
    expect(together.first.state.doc.textContent).toContain('Suyo');

    together.close();
  });

  it('puts it back when asked to redo, without touching what the other person wrote', () => {
    const together = openTogether();
    writeAtTheEnd(together.first, 'Mio');
    writeAtTheEnd(together.second, 'Suyo');
    PAGE_EDITOR_COMMANDS.undo.run(together.first.state, together.first.dispatch);

    PAGE_EDITOR_COMMANDS.redo.run(together.first.state, together.first.dispatch);

    expect(together.first.state.doc.textContent).toContain('Mio');
    expect(together.first.state.doc.textContent).toContain('Suyo');

    together.close();
  });
});
