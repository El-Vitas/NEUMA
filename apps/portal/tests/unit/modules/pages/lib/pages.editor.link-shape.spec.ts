import { describe, expect, it } from 'bun:test';
import { EditorState } from 'prosemirror-state';
import {
  createPageBookmarkFromLinkCommand,
  createPageEmbedFromLinkCommand,
  readPastedLinkUrl,
} from '@/modules/pages/lib/pages.editor.link-shape.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

const pageSaying = (text: string): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.node('doc', null, [pageEditorSchema.node('paragraph', null, [pageEditorSchema.text(text)])]),
    schema: pageEditorSchema,
  });

const runOn = (state: EditorState, command: ReturnType<typeof createPageEmbedFromLinkCommand>) => {
  let next = state;
  const ran = command(state, (transaction) => {
    next = state.apply(transaction);
  });
  return { doc: next.doc, ran };
};

describe('turning a pasted link into what it should be', () => {
  const range = { from: 1, to: 1 + url.length };

  it('makes something that plays out of a link one of the services holds', () => {
    const { doc, ran } = runOn(pageSaying(url), createPageEmbedFromLinkCommand(pageEditorSchema, range, url));

    expect(ran).toBe(true);
    expect(doc.child(0).type.name).toBe('embed');
    expect(doc.child(0).attrs).toMatchObject({ provider: 'youtube', url });
  });

  /** A link nobody can embed is left exactly as it was pasted, and the page says why. */
  it('refuses to embed a link to anywhere else, leaving the writing untouched', () => {
    const other = 'https://example.com/a';
    const state = pageSaying(other);

    const { doc, ran } = runOn(
      state,
      createPageEmbedFromLinkCommand(pageEditorSchema, { from: 1, to: 1 + other.length }, other),
    );

    expect(ran).toBe(false);
    expect(doc.textContent).toBe(other);
  });

  it('makes a card out of what could be read about the link', () => {
    const { doc, ran } = runOn(
      pageSaying(url),
      createPageBookmarkFromLinkCommand(pageEditorSchema, range, { icon: 'https://y/i.png', title: 'Un video', url }),
    );

    expect(ran).toBe(true);
    expect(doc.child(0).type.name).toBe('bookmark');
    expect(doc.child(0).attrs).toMatchObject({ icon: 'https://y/i.png', title: 'Un video', url });
  });

  it('makes a card of a link nothing could be read about, which still says where it points', () => {
    const { doc, ran } = runOn(pageSaying(url), createPageBookmarkFromLinkCommand(pageEditorSchema, range, { url }));

    expect(ran).toBe(true);
    expect(doc.child(0).attrs).toMatchObject({ title: null, url });
  });
});

describe('what counts as a link on the clipboard', () => {
  it('is one address and nothing else', () => {
    expect(readPastedLinkUrl(' https://example.com/a ')).toBe('https://example.com/a');
    expect(readPastedLinkUrl('https://example.com/a b')).toBeNull();
    expect(readPastedLinkUrl('mira esto: https://example.com/a')).toBeNull();
    expect(readPastedLinkUrl('')).toBeNull();
  });

  /** Only what the page can go on to ask about or show: nothing is offered for what it cannot. */
  it('is asked for over a safe connection', () => {
    expect(readPastedLinkUrl('http://example.com/a')).toBeNull();
    expect(readPastedLinkUrl('javascript:alert(1)')).toBeNull();
    expect(readPastedLinkUrl('example.com')).toBeNull();
  });
});
