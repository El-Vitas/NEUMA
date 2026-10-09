import { canPageBlockHold, pageBookmarkAttrsSchema, pageEmbedAttrsSchema } from '@company-brain/shared';
import type { Node as EditorNode, NodeType, ResolvedPos, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { PageLinkPreview } from '../../../links/types/pages.link-preview.types';
import {
  PAGE_EDITOR_BOOKMARK_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { readPageEmbedProvider } from '../../media/lib/pages.editor.embed.lib';
import { PAGE_EDITOR_LINK_WHITESPACE } from '../constants/pages.editor.link-shape.constants';
import type { PageEditorLinkRange } from '../types/pages.editor.link-shape.types';

/** Falls back to an ancestor depth when the link's own parent cannot hold the block (a quote cannot hold a frame). */
const findDepthThatHolds = (at: ResolvedPos, type: NodeType): number | null => {
  for (let depth = at.depth; depth > 0; depth -= 1) {
    if (canPageBlockHold(at.node(depth - 1).type.name, type.name)) return depth;
  }
  return null;
};

/** The range spans whole blocks (a card or a frame), so it is replaced as is. */
const replaceBlocksWith =
  (at: ResolvedPos, range: PageEditorLinkRange, block: EditorNode): Command =>
  (state, dispatch) => {
    if (!canPageBlockHold(at.parent.type.name, block.type.name)) return false;
    if (dispatch === undefined) return true;
    dispatch(state.tr.replaceWith(range.from, range.to, block).scrollIntoView());
    return true;
  };

/** A line holding only the link becomes the block; a link inside a sentence gets the block inserted after it. */
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

const replaceLinkWith =
  (schema: Schema, range: PageEditorLinkRange, type: string, attrs: Record<string, unknown>): Command =>
  (state, dispatch) => {
    if (range.to > state.doc.content.size) return false;
    const at = state.doc.resolve(range.from);
    const block = schema.nodes[type].createChecked(attrs);
    const put = at.parent.isTextblock ? replaceWritingWith(at, range, block) : replaceBlocksWith(at, range, block);
    return put(state, dispatch);
  };

export const createPageEmbedFromLinkCommand = (schema: Schema, range: PageEditorLinkRange, url: string): Command => {
  const provider = readPageEmbedProvider(url);
  if (provider === null) return () => false;
  const attrs = pageEmbedAttrsSchema.safeParse({ provider, url });
  if (!attrs.success) return () => false;
  return replaceLinkWith(schema, range, PAGE_EDITOR_EMBED_TYPE, attrs.data);
};

export const createPageBookmarkFromLinkCommand = (
  schema: Schema,
  range: PageEditorLinkRange,
  preview: PageLinkPreview,
): Command => {
  const attrs = pageBookmarkAttrsSchema.safeParse(preview);
  if (!attrs.success) return () => false;
  return replaceLinkWith(schema, range, PAGE_EDITOR_BOOKMARK_TYPE, attrs.data);
};

/** The pasted text as a URL, only when it is a lone https address; text around it is pasted as plain text. */
export const readPastedLinkUrl = (text: string): string | null => {
  const said = text.trim();
  if (said.length === 0 || PAGE_EDITOR_LINK_WHITESPACE.test(said) || !URL.canParse(said)) return null;
  return new URL(said).protocol === 'https:' ? said : null;
};
