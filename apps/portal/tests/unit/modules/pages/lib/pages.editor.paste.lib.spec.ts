import { describe, expect, it } from 'bun:test';
import { EditorState, TextSelection } from 'prosemirror-state';
import { PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH } from '@/modules/pages/constants/pages.editor.paste.constants';
import {
  buildPageEditorPlainTextParagraphs,
  decidePageEditorPaste,
  dispatchPageEditorLinkOverSelection,
  dispatchPageEditorMarkdownBlocks,
  dispatchPageEditorPlainTextPaste,
} from '@/modules/pages/lib/pages.editor.paste.lib';
import { pageEditorSchema } from '@/modules/pages/lib/pages.editor.schema';
import type { PageEditorPasteTarget } from '@/modules/pages/types/pages.editor.paste.types';

const pageSaying = (text: string): EditorState =>
  EditorState.create({
    doc: pageEditorSchema.node('doc', null, [
      pageEditorSchema.node('paragraph', null, text.length === 0 ? [] : [pageEditorSchema.text(text)]),
    ]),
    schema: pageEditorSchema,
  });

const inputAt = (
  plainText: string,
  overrides: { readonly hasSelection?: boolean; readonly html?: string; readonly wantedPlainText?: boolean } = {},
) => ({
  hasSelection: overrides.hasSelection ?? false,
  html: overrides.html ?? '',
  plainText,
  wantedPlainText: overrides.wantedPlainText ?? false,
});

describe('deciding what a paste becomes', () => {
  it('asks for plain writing, with no marks, once the shortcut asked for it', () => {
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('**not bold**', { wantedPlainText: true }))).toEqual({
      kind: 'plain-text',
      text: '**not bold**',
    });
  });

  it('does nothing for the shortcut once the clipboard has no writing on it', () => {
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('', { wantedPlainText: true }))).toEqual({
      kind: 'default',
    });
  });

  it('reads a bare address at the cursor as a link waiting for its shape', () => {
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('https://example.com/a'))).toEqual({
      kind: 'link-at-cursor',
      url: 'https://example.com/a',
    });
  });

  it('reads a bare address pasted over a selection as turning that writing into a link', () => {
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('https://example.com/a', { hasSelection: true }))).toEqual({
      kind: 'link-over-selection',
      url: 'https://example.com/a',
    });
  });

  it('leaves what ProseMirror already marked as its own clipboard slice untouched', () => {
    const html = '<p data-pm-slice="0 0 []">hello</p>';
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('hello', { html }))).toEqual({ kind: 'own-slice' });
  });

  it('leaves HTML from a stranger to the schema itself, since it already reads headings, lists and links', () => {
    const html = '<h1>Title</h1>';
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('Title', { html }))).toEqual({ kind: 'default' });
  });

  it('leaves an ordinary sentence as the default paste, since it is not written as Markdown', () => {
    expect(decidePageEditorPaste(pageEditorSchema, inputAt('Just a sentence.'))).toEqual({ kind: 'default' });
  });

  it('reads Markdown into the blocks it already knows how to write', () => {
    const decision = decidePageEditorPaste(pageEditorSchema, inputAt('# Title'));
    expect(decision.kind).toBe('markdown-blocks');
  });

  it('refuses to read Markdown too large to keep reading a line at a time, and says so as pasted text', () => {
    const huge = `- ${'a'.repeat(PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH)}`;
    expect(decidePageEditorPaste(pageEditorSchema, inputAt(huge)).kind).toBe('too-large');
  });

  it('does not choke on a plain, huge paste that is not written as Markdown at all', () => {
    const huge = 'a'.repeat(2_000_000);
    const startedAt = performance.now();
    const decision = decidePageEditorPaste(pageEditorSchema, inputAt(huge));
    expect(performance.now() - startedAt).toBeLessThan(500);
    expect(decision).toEqual({ kind: 'default' });
  });
});

describe('carrying a decision onto the page', () => {
  const targetFor = (state: EditorState): PageEditorPasteTarget & { readonly applied: EditorState[] } => {
    const applied: EditorState[] = [];
    let current = state;
    return {
      get state() {
        return current;
      },
      applied,
      dispatch: (transaction) => {
        current = current.apply(transaction);
        applied.push(current);
      },
    };
  };

  it('builds one paragraph per line, no marks, and leaves blank lines out', () => {
    const paragraphs = buildPageEditorPlainTextParagraphs(pageEditorSchema, 'first\n\nsecond\nthird');

    expect(paragraphs).toHaveLength(3);
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual(['first', 'second', 'third']);
    expect(paragraphs.every((paragraph) => paragraph.type.name === 'paragraph')).toBe(true);
    expect(paragraphs.flatMap((paragraph) => paragraph.content.content).every((node) => node.marks.length === 0)).toBe(
      true,
    );
  });

  it('joins a single pasted line into the sentence it lands in, leaving the block count unchanged', () => {
    const sentence = 'Una frase con un hueco al final.';
    const target = targetFor(pageSaying(sentence));
    const cursor = 1 + sentence.indexOf('al final');
    target.dispatch(target.state.tr.setSelection(TextSelection.create(target.state.doc, cursor)));
    const appliedBeforePaste = target.applied.length;

    dispatchPageEditorPlainTextPaste(target, 'pegado ');

    expect(target.applied).toHaveLength(appliedBeforePaste + 1);
    expect(target.state.doc.childCount).toBe(1);
    expect(target.state.doc.textContent).toBe('Una frase con un hueco pegado al final.');
    expect(target.state.selection.to).toBe(cursor + 'pegado '.length);
  });

  it('joins the first and last of several pasted lines into the sentence, keeping only the middle as its own block', () => {
    const sentence = 'Una frase con un hueco al final.';
    const target = targetFor(pageSaying(sentence));
    const cursor = 1 + sentence.indexOf('al final');
    target.dispatch(target.state.tr.setSelection(TextSelection.create(target.state.doc, cursor)));
    const appliedBeforePaste = target.applied.length;

    dispatchPageEditorPlainTextPaste(target, 'primero\nmedio\nultimo ');

    expect(target.applied).toHaveLength(appliedBeforePaste + 1);
    const paragraphs = target.state.doc.content.content.map((node) => node.textContent);
    expect(paragraphs).toEqual(['Una frase con un hueco primero', 'medio', 'ultimo al final.']);
  });

  it('turns a paste with many lines into many blocks instead of one, however large it is', () => {
    const target = targetFor(pageSaying(''));
    const huge = Array.from({ length: 5000 }, (_unused, line) => `line ${line}`).join('\n');

    const startedAt = performance.now();
    dispatchPageEditorPlainTextPaste(target, huge);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(2000);
    expect(target.applied).toHaveLength(1);
    expect(target.state.doc.childCount).toBe(5000);
    expect(target.state.doc.child(0).type.name).toBe('paragraph');
    expect(target.state.doc.child(4999).textContent).toBe('line 4999');
  });

  it('turns the selected writing into a link instead of replacing it with the pasted address', () => {
    const target = targetFor(pageSaying('click here please'));
    target.dispatch(target.state.tr.setSelection(TextSelection.create(target.state.doc, 7, 11)));

    dispatchPageEditorLinkOverSelection(target, 'https://example.com/a');

    expect(target.state.doc.textContent).toBe('click here please');
    const linked = target.state.doc.textBetween(7, 11);
    expect(linked).toBe('here');
    let sawTheLink = false;
    target.state.doc.nodesBetween(7, 11, (node) => {
      if (node.marks.some((mark) => mark.type.name === 'link' && mark.attrs.href === 'https://example.com/a')) {
        sawTheLink = true;
      }
    });
    expect(sawTheLink).toBe(true);
  });

  it('writes every block of a Markdown paste in one step, leaving somewhere to keep writing after it', () => {
    const target = targetFor(pageSaying(''));
    const nodes = [pageEditorSchema.nodes.divider.createChecked()];

    dispatchPageEditorMarkdownBlocks(target, nodes);

    expect(target.applied).toHaveLength(1);
    expect(target.state.doc.lastChild?.type.name).toBe('paragraph');
    expect(target.state.doc.child(target.state.doc.childCount - 2).type.name).toBe('divider');
  });
});
