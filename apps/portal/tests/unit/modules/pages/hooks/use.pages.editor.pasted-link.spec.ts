import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import en from '../../../../../messages/en.json';

const resolveEnglishTranslation = (key: string): string => {
  const node = key
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null ? (current as Record<string, unknown>)[segment] : undefined,
      en.pages,
    );
  return typeof node === 'string' ? node : key;
};

/**
 * A fresh function every call, the way next-intl's real `useTranslations`
 * behaves — a hook that returned the same `t` across renders would hide the
 * exact regression this file guards against.
 */
mock.module('next-intl', () => ({
  useTranslations: () => (key: string) => resolveEnglishTranslation(key),
}));

const errors: string[] = [];
mock.module('sonner', () => ({
  toast: {
    dismiss: () => undefined,
    error: (message: string) => errors.push(message),
    loading: () => 'loading-id',
    success: () => undefined,
  },
}));

const { usePagesEditorPastedLink } = await import('@/modules/pages/hooks/use.pages.editor.pasted-link');
const { PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH } = await import(
  '@/modules/pages/constants/pages.editor.paste.constants'
);
const { createPageEditorState } = await import('@/modules/pages/lib/pages.editor.lib');

const mountEditor = (): EditorView => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const pageContent = { content: [{ content: [{ text: 'hello world', type: 'text' }], type: 'paragraph' }] };
  return new EditorView(container, {
    state: createPageEditorState({ ...pageContent, schemaVersion: 1, type: 'doc' }, 'Select block', 'Insert block'),
  });
};

/** Stable across renders, the way the real surface rect callback is memoised in the editor component. */
const readNoSurfaceRect = () => null;

const renderPastedLink = () => {
  const editorViewRef: { current: EditorView | null } = { current: mountEditor() };
  const rendered = renderHook(() => usePagesEditorPastedLink(editorViewRef, readNoSurfaceRect));
  const editorView = editorViewRef.current;
  if (editorView === null) throw new Error('the test editor failed to mount');
  return { editorView, ...rendered };
};

const pasteEventWith = (data: Readonly<Record<string, string>>): ClipboardEvent => {
  const clipboardData = new DataTransfer();
  for (const [type, value] of Object.entries(data)) clipboardData.setData(type, value);
  return new ClipboardEvent('paste', { cancelable: true, clipboardData });
};

const putCursorAt = (editorView: EditorView, position: number): void => {
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.create(editorView.state.doc, position)));
};

const putCursorAtEnd = (editorView: EditorView): void => {
  editorView.dispatch(editorView.state.tr.setSelection(Selection.atEnd(editorView.state.doc)));
};

const selectRange = (editorView: EditorView, from: number, to: number): void => {
  editorView.dispatch(editorView.state.tr.setSelection(TextSelection.create(editorView.state.doc, from, to)));
};

const pressPlainTextShortcut = (editorView: EditorView): void => {
  editorView.dom.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'v', shiftKey: true }),
  );
};

const handlePaste = (
  handlePastedLink: (view: EditorView, event: ClipboardEvent) => boolean,
  editorView: EditorView,
  event: ClipboardEvent,
): boolean => {
  let handled = false;
  act(() => {
    handled = handlePastedLink(editorView, event);
  });
  return handled;
};

describe('what the editor is rebuilt on', () => {
  it('keeps handlePastedLink the same function across a re-render, so the editor is never torn down for it', () => {
    const { rerender, result } = renderPastedLink();
    const handlePastedLinkBeforeRerender = result.current.handlePastedLink;

    act(() => {
      rerender();
    });

    expect(result.current.handlePastedLink).toBe(handlePastedLinkBeforeRerender);
  });
});

describe('pasting from another page of the app', () => {
  it('leaves what ProseMirror already marked as its own clipboard slice for ProseMirror itself to restore', () => {
    const { editorView, result } = renderPastedLink();
    const event = pasteEventWith({ 'text/html': '<p data-pm-slice="0 0 []">hello</p>', 'text/plain': 'hello' });

    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('pasting Markdown', () => {
  it('turns it into real blocks instead of a run of plain text', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAtEnd(editorView);
    const event = pasteEventWith({ 'text/plain': '# A title\n\n- one\n- two' });

    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    const types = editorView.state.doc.content.content.map((node) => node.type.name);
    expect(types).toContain('heading');
    expect(types).toContain('bullet_list');
  });
});

describe('pasting HTML from a website', () => {
  it('leaves the schema itself to read the headings, lists and links it already knows', () => {
    const { editorView, result } = renderPastedLink();
    const event = pasteEventWith({ 'text/html': '<h1>Title</h1><ul><li>one</li></ul>', 'text/plain': 'Title\none' });

    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('pasting with Ctrl+Shift+V', () => {
  it('lands as plain text, with no marks and no block written from what looks like Markdown', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAtEnd(editorView);
    pressPlainTextShortcut(editorView);
    const event = pasteEventWith({ 'text/plain': '# not a heading' });

    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(true);
    expect(editorView.state.doc.textContent).toContain('# not a heading');
    expect(editorView.state.doc.content.content.every((node) => node.type.name === 'paragraph')).toBe(true);
  });

  it('answers only the very next paste, not the ones after it', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAtEnd(editorView);
    pressPlainTextShortcut(editorView);
    handlePaste(result.current.handlePastedLink, editorView, pasteEventWith({ 'text/plain': 'first' }));

    const secondEvent = pasteEventWith({ 'text/plain': '# a real heading' });
    handlePaste(result.current.handlePastedLink, editorView, secondEvent);

    const types = editorView.state.doc.content.content.map((node) => node.type.name);
    expect(types).toContain('heading');
  });

  it('forgets the shortcut once another key is pressed before the paste that was meant to answer it', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAtEnd(editorView);
    pressPlainTextShortcut(editorView);
    editorView.dom.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));

    const event = pasteEventWith({ 'text/html': '<h1>Title</h1>', 'text/plain': 'Title' });
    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(editorView.state.doc.textContent).toBe('hello world');
  });
});

describe('pasting a URL', () => {
  it('turns selected writing into a link instead of replacing it with the address', () => {
    const { editorView, result } = renderPastedLink();
    selectRange(editorView, 1, 6);
    const event = pasteEventWith({ 'text/plain': 'https://example.com/a' });

    const handled = handlePaste(result.current.handlePastedLink, editorView, event);

    expect(handled).toBe(true);
    expect(editorView.state.doc.textContent).toBe('hello world');
    let sawTheLink = false;
    editorView.state.doc.nodesBetween(1, 6, (node) => {
      if (node.marks.some((mark) => mark.type.name === 'link' && mark.attrs.href === 'https://example.com/a')) {
        sawTheLink = true;
      }
    });
    expect(sawTheLink).toBe(true);
  });

  it('still lands at the cursor as a link waiting for its shape to be chosen', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAt(editorView, 1);
    const event = pasteEventWith({ 'text/plain': 'https://example.com/a' });

    handlePaste(result.current.handlePastedLink, editorView, event);

    expect(result.current.pasted?.url).toBe('https://example.com/a');
    expect(editorView.state.doc.textContent).toContain('https://example.com/a');
  });
});

describe('pasting more than the page can read a line at a time', () => {
  it('does not freeze, and says the page kept it as text instead of blocks', () => {
    const { editorView, result } = renderPastedLink();
    putCursorAtEnd(editorView);
    const huge = `- ${'a'.repeat(PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH)}`;
    const event = pasteEventWith({ 'text/plain': huge });

    const startedAt = performance.now();
    const handled = handlePaste(result.current.handlePastedLink, editorView, event);
    const elapsedMs = performance.now() - startedAt;

    expect(handled).toBe(true);
    expect(elapsedMs).toBeLessThan(2000);
    expect(errors).toContain(en.pages.paste.tooMuch);
  });
});
