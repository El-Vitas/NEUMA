import { canPageBlockHold, pageBookmarkAttrsSchema, pageEmbedAttrsSchema } from '@company-brain/shared';
import type { Node as EditorNode, NodeType, ResolvedPos, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { PageLinkPreview } from '../../../types/pages.link-preview.types';
import {
  PAGE_EDITOR_BOOKMARK_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { readPageEmbedProvider } from '../../media/lib/pages.editor.embed.lib';
import { PAGE_EDITOR_LINK_WHITESPACE } from '../constants/pages.editor.link-shape.constants';
import type { PageEditorLinkRange } from '../types/pages.editor.link-shape.types';

/**
 * How deep the block can sit: the innermost place around the link that is
 * allowed to hold it.
 *
 * A link pasted inside a quotation cannot become a frame there — a quotation
 * holds writing — so the frame is placed under the quotation instead of being
 * refused, or worse, written somewhere the page cannot be saved from.
 */
const findDepthThatHolds = (at: ResolvedPos, type: NodeType): number | null => {
  for (let depth = at.depth; depth > 0; depth -= 1) {
    if (canPageBlockHold(at.node(depth - 1).type.name, type.name)) return depth;
  }
  return null;
};

/**
 * A range that names whole blocks — what the menu of a card or a frame speaks
 * of — is taken as it is, rather than looked for inside a line.
 */
const replaceBlocksWith =
  (at: ResolvedPos, range: PageEditorLinkRange, block: EditorNode): Command =>
  (state, dispatch) => {
    if (!canPageBlockHold(at.parent.type.name, block.type.name)) return false;
    if (dispatch === undefined) return true;
    dispatch(state.tr.replaceWith(range.from, range.to, block).scrollIntoView());
    return true;
  };

/**
 * A line that holds nothing but the link becomes the block, since that is what
 * the line was for; a link written into the middle of a sentence gets the block
 * underneath instead, because the sentence is still being written.
 */
const replaceWritingWith =
  (at: ResolvedPos, range: PageEditorLinkRange, block: EditorNode): Command =>
  (state, dispatch) => {
    const depth = findDepthThatHolds(at, block.type);
    if (depth === null) return false;
    if (dispatch === undefined) return true;
    const holdsOnlyTheLink = depth === at.depth && at.parent.textContent.trim().length === range.to - range.from;
    const transaction = holdsOnlyTheLink
      ? state.tr.replaceWith(at.before(depth), at.after(depth), block)
      : state.tr.insert(at.after(depth), block);
    dispatch(transaction.scrollIntoView());
    return true;
  };

/** Puts a block where the link is, wherever the link turns out to be. */
const replaceLinkWith =
  (schema: Schema, range: PageEditorLinkRange, type: string, attrs: Record<string, unknown>): Command =>
  (state, dispatch) => {
    if (range.to > state.doc.content.size) return false;
    const at = state.doc.resolve(range.from);
    const block = schema.nodes[type].createChecked(attrs);
    const put = at.parent.isTextblock ? replaceWritingWith(at, range, block) : replaceBlocksWith(at, range, block);
    return put(state, dispatch);
  };

/** Shows the link inside the page, when it is one of the services a page can show. */
export const createPageEmbedFromLinkCommand = (schema: Schema, range: PageEditorLinkRange, url: string): Command => {
  const provider = readPageEmbedProvider(url);
  if (provider === null) return () => false;
  const attrs = pageEmbedAttrsSchema.safeParse({ provider, url });
  if (!attrs.success) return () => false;
  return replaceLinkWith(schema, range, PAGE_EDITOR_EMBED_TYPE, attrs.data);
};

/** Keeps the link as a card, with whatever could be read about it. */
export const createPageBookmarkFromLinkCommand = (
  schema: Schema,
  range: PageEditorLinkRange,
  preview: PageLinkPreview,
): Command => {
  const attrs = pageBookmarkAttrsSchema.safeParse(preview);
  if (!attrs.success) return () => false;
  return replaceLinkWith(schema, range, PAGE_EDITOR_BOOKMARK_TYPE, attrs.data);
};

/**
 * The one address on the clipboard, when that is all there is on it.
 *
 * Anything written around it is writing, and writing is pasted as writing. Only
 * a safe address is offered a choice, since it is the only kind the page can go
 * on to ask about or show inside itself.
 */
export const readPastedLinkUrl = (text: string): string | null => {
  const said = text.trim();
  if (said.length === 0 || PAGE_EDITOR_LINK_WHITESPACE.test(said) || !URL.canParse(said)) return null;
  return new URL(said).protocol === 'https:' ? said : null;
};
