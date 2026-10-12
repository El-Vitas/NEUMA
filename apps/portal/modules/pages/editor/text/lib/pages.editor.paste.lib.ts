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

const isPageEditorOwnSlice = (html: string): boolean => html.includes(PAGE_EDITOR_OWN_SLICE_ATTRIBUTE);

/** Checks run from the surest reading to the weakest; Markdown is a guess, so it comes last. */
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

export const buildPageEditorPlainTextParagraphs = (schema: Schema, text: string): readonly EditorNode[] =>
  text
    .split(PAGE_EDITOR_LINE_BREAK_PATTERN)
    .filter((line) => line.trim().length > 0)
    .map((line) => schema.nodes.paragraph.createChecked(null, schema.text(line)));

const dispatchPageEditorSlice = (target: PageEditorPasteTarget, slice: Slice): void => {
  const replaced = target.state.tr.replaceSelection(slice);
  target.dispatch(leaveSomewhereToWriteUnder(replaced, target.state.schema).scrollIntoView());
};

/** Open at both ends, like ProseMirror's own plain-text paste: a single line never splits the sentence it lands in. */
export const dispatchPageEditorPlainTextPaste = (target: PageEditorPasteTarget, text: string): void => {
  const paragraphs = buildPageEditorPlainTextParagraphs(target.state.schema, text);
  if (paragraphs.length === 0) return;
  dispatchPageEditorSlice(target, new Slice(Fragment.from(paragraphs), 1, 1));
};

export const dispatchPageEditorLinkOverSelection = (target: PageEditorPasteTarget, url: string): void => {
  const { from, to } = target.state.selection;
  const mark = target.state.schema.marks.link.create({ href: url });
  target.dispatch(target.state.tr.addMark(from, to, mark).scrollIntoView());
};

/** Closed at both ends: pasted headings and lists stay separate blocks instead of merging into the paragraph. */
export const dispatchPageEditorMarkdownBlocks = (target: PageEditorPasteTarget, nodes: readonly EditorNode[]): void => {
  if (nodes.length === 0) return;
  dispatchPageEditorSlice(target, new Slice(Fragment.from(nodes), 0, 0));
};
