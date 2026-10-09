import type { Node as EditorNode, Schema } from 'prosemirror-model';
import { Fragment, Slice } from 'prosemirror-model';
import { leaveSomewhereToWriteUnder } from '../../lib/pages.editor.write-under.lib';
import { readPastedLinkUrl } from '../../menus/lib/pages.editor.link-shape.lib';
import { PAGE_EDITOR_LINE_BREAK_PATTERN } from '../constants/pages.editor.markdown.constants';
import {
  PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH,
  PAGE_EDITOR_OWN_SLICE_ATTRIBUTE,
} from '../constants/pages.editor.paste.constants';
import type {
  PageEditorPasteDecision,
  PageEditorPasteInput,
  PageEditorPasteTarget,
} from '../types/pages.editor.paste.types';
import { looksLikePageEditorMarkdown, parsePageEditorMarkdown } from './pages.editor.markdown.lib';

/** The mark ProseMirror leaves on its own clipboard HTML, so a paste from an editor is never re-read as a stranger's. */
const isPageEditorOwnSlice = (html: string): boolean => html.includes(PAGE_EDITOR_OWN_SLICE_ATTRIBUTE);

/**
 * What a paste is asked to become, worked out without touching the page.
 *
 * The checks run in the order writing already answers to: what was asked for
 * in plain text first, then a bare address, then whatever this editor left on
 * its own clipboard, and only after all of that a stretch of Markdown — since
 * Markdown is the one guess among these, and every surer reading comes first.
 */
export const decidePageEditorPaste = (schema: Schema, input: PageEditorPasteInput): PageEditorPasteDecision => {
  if (input.wantedPlainText) {
    return input.plainText.length === 0 ? { kind: 'default' } : { kind: 'plain-text', text: input.plainText };
  }

  const url = readPastedLinkUrl(input.plainText);
  if (url !== null) return { kind: input.hasSelection ? 'link-over-selection' : 'link-at-cursor', url };

  if (isPageEditorOwnSlice(input.html)) return { kind: 'own-slice' };
  if (input.html.length > 0 || input.plainText.length === 0) return { kind: 'default' };
  if (!looksLikePageEditorMarkdown(input.plainText)) return { kind: 'default' };
  if (input.plainText.length > PAGE_EDITOR_MAX_CONVERTIBLE_PASTE_LENGTH)
    return { kind: 'too-large', text: input.plainText };

  const nodes = parsePageEditorMarkdown(schema, input.plainText);
  return nodes.length === 0 ? { kind: 'default' } : { kind: 'markdown-blocks', nodes };
};

/**
 * Text without a single mark on it, one paragraph per line and blank lines
 * left out — so a plain-text paste never grows a single block with however
 * much was pasted, the same way a Markdown paste does not.
 */
export const buildPageEditorPlainTextParagraphs = (schema: Schema, text: string): readonly EditorNode[] =>
  text
    .split(PAGE_EDITOR_LINE_BREAK_PATTERN)
    .filter((line) => line.trim().length > 0)
    .map((line) => schema.nodes.paragraph.createChecked(null, schema.text(line)));

/** Replaces the selection with a slice in one step, leaving somewhere to keep writing after it. */
const dispatchPageEditorSlice = (target: PageEditorPasteTarget, slice: Slice): void => {
  const replaced = target.state.tr.replaceSelection(slice);
  target.dispatch(leaveSomewhereToWriteUnder(replaced, target.state.schema).scrollIntoView());
};

/**
 * Open at both ends, the way ProseMirror itself builds a plain-text paste:
 * the first pasted line continues the block the cursor is in and the last
 * one runs into whatever followed the cursor, so only the lines between
 * them stand as blocks of their own. A single pasted line never breaks the
 * sentence it lands in — it never gets a block boundary of its own at all.
 */
export const dispatchPageEditorPlainTextPaste = (target: PageEditorPasteTarget, text: string): void => {
  const paragraphs = buildPageEditorPlainTextParagraphs(target.state.schema, text);
  if (paragraphs.length === 0) return;
  dispatchPageEditorSlice(target, new Slice(Fragment.from(paragraphs), 1, 1));
};

/** Keeps what was already written and lets the pasted address speak for it instead of replacing it. */
export const dispatchPageEditorLinkOverSelection = (target: PageEditorPasteTarget, url: string): void => {
  const { from, to } = target.state.selection;
  const mark = target.state.schema.marks.link.create({ href: url });
  target.dispatch(target.state.tr.addMark(from, to, mark).scrollIntoView());
};

/** Closed at both ends: a pasted heading or list arrives as its own block, never melted into the paragraph it lands in. */
export const dispatchPageEditorMarkdownBlocks = (target: PageEditorPasteTarget, nodes: readonly EditorNode[]): void => {
  if (nodes.length === 0) return;
  dispatchPageEditorSlice(target, new Slice(Fragment.from(nodes), 0, 0));
};
