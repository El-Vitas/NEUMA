import { afterEach, describe, expect, it } from 'bun:test';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Doc } from 'yjs';
import { pageEditorSchema } from '@/modules/pages/editor/lib/pages.editor.schema';
import {
  createCollaborativePageEditorState,
  keepClicksAcrossChangesFromOthers,
  readWhereThisPersonWrites,
} from '@/modules/pages/lib/pages.collaboration.lib';

const FIRST_PARAGRAPH = 'Escribe A';
const SECOND_PARAGRAPH = 'Escribe B';
const CLICKED_OFFSET = 3;
const SOMEBODY_ELSE = 7;

const closers: (() => void)[] = [];

const openLivePage = (): { readonly view: EditorView; readonly provider: HocuspocusProvider } => {
  const document_ = new Doc();
  const provider = new HocuspocusProvider({
    document: document_,
    name: 'page',
    websocketProvider: new HocuspocusProviderWebsocket({ autoConnect: false, url: 'ws://localhost' }),
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = new EditorView(container, { state: EditorState.create({ schema: pageEditorSchema }) });
  const stopKeepingClicks = keepClicksAcrossChangesFromOthers(view, document_, provider.awareness);
  view.updateState(
    createCollaborativePageEditorState(
      { awareness: provider.awareness, fragment: document_.getXmlFragment('prosemirror') },
      'Select block',
    ),
  );
  const paragraphs = [FIRST_PARAGRAPH, SECOND_PARAGRAPH].map((text) =>
    pageEditorSchema.nodes.paragraph.create(null, pageEditorSchema.text(text)),
  );
  view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, paragraphs));
  closers.push(() => {
    stopKeepingClicks();
    view.destroy();
    provider.destroy();
    document_.destroy();
  });
  return { provider, view };
};

// The browser moves the caret on a click and tells the editor a moment later.
const clickWithoutTellingTheEditorYet = (view: EditorView, paragraphText: string): void => {
  const holdSelectionChange = (event: Event): void => event.stopImmediatePropagation();
  window.addEventListener('selectionchange', holdSelectionChange, true);
  const paragraph = [...view.dom.querySelectorAll('p')].find((element) => element.textContent === paragraphText);
  const text = paragraph?.firstChild;
  if (!text) throw new Error(`paragraph-not-found: ${paragraphText}`);
  view.dom.focus();
  window.getSelection()?.collapse(text, CLICKED_OFFSET);
  closers.push(() => window.removeEventListener('selectionchange', holdSelectionChange, true));
};

afterEach(() => {
  for (const close of closers.splice(0)) close();
});

describe('keepClicksAcrossChangesFromOthers', () => {
  // Drawing another caret rewrites the page and the remembered caret, stale until the click is reported.
  it('keeps a click the editor has not read yet when somebody else only moves their caret', () => {
    const { provider, view } = openLivePage();
    clickWithoutTellingTheEditorYet(view, SECOND_PARAGRAPH);

    provider.awareness?.emit('change', [{ added: [], removed: [], updated: [SOMEBODY_ELSE] }, 'remote']);

    expect(view.state.selection.$head.parent.textContent).toBe(SECOND_PARAGRAPH);
    expect(view.state.selection.$head.parentOffset).toBe(CLICKED_OFFSET);
  });
});

describe('readWhereThisPersonWrites', () => {
  it('answers with the click the editor has not read yet, not with the caret it remembers', () => {
    const { view } = openLivePage();
    clickWithoutTellingTheEditorYet(view, SECOND_PARAGRAPH);

    const { anchor, head } = readWhereThisPersonWrites(view);

    expect(view.state.doc.resolve(anchor).parent.textContent).toBe(SECOND_PARAGRAPH);
    expect(view.state.doc.resolve(head).parentOffset).toBe(CLICKED_OFFSET);
  });

  it('answers with the caret the editor remembers when the page is not being written', () => {
    const { view } = openLivePage();

    expect(readWhereThisPersonWrites(view)).toEqual({
      anchor: view.state.selection.anchor,
      head: view.state.selection.head,
    });
  });
});
