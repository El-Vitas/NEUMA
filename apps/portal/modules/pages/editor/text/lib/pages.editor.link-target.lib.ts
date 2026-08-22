import type { Node as EditorNode } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import {
  PAGE_EDITOR_BOOKMARK_TYPE,
  PAGE_EDITOR_EMBED_TYPE,
} from '../../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import type { PageEditorLinkShape, PageEditorLinkTarget } from '../../menus/types/pages.editor.link-shape.types';

/** The one link a line holds, when the line holds nothing else. */
const readTheOnlyLink = (block: EditorNode): string | null => {
  if (block.childCount !== 1) return null;
  const written = block.child(0);
  const link = written.marks.find((mark) => mark.type.name === 'link');
  if (link === undefined || written.text !== block.textContent) return null;
  return typeof link.attrs.href === 'string' ? link.attrs.href : null;
};

const readShapeOfBlock = (block: EditorNode): PageEditorLinkShape | null => {
  if (block.type.name === PAGE_EDITOR_BOOKMARK_TYPE) return 'card';
  if (block.type.name === PAGE_EDITOR_EMBED_TYPE) return 'embed';
  return readTheOnlyLink(block) === null ? null : 'link';
};

const readUrlOfBlock = (block: EditorNode): string | null => {
  if (block.type.name === PAGE_EDITOR_BOOKMARK_TYPE || block.type.name === PAGE_EDITOR_EMBED_TYPE) {
    return typeof block.attrs.url === 'string' ? block.attrs.url : null;
  }
  return readTheOnlyLink(block);
};

/**
 * The link the selected block is, whatever shape it is wearing.
 *
 * A page holds the same link as a line, as a card or as a frame, and which of
 * the three it wears should be answerable long after it was pasted — the moment
 * of pasting is not the only moment anyone knows what they want.
 */
export const readPageLinkTarget = (state: EditorState): PageEditorLinkTarget | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const block = range.parent.child(range.startIndex);
  const shape = readShapeOfBlock(block);
  const url = readUrlOfBlock(block);
  if (shape === null || url === null) return null;
  return { chosen: shape, from: range.start, to: range.end, url };
};

/** Brings the link back to being a line of writing that points somewhere. */
export const createPageLinkFromBlockCommand =
  (target: PageEditorLinkTarget): Command =>
  (state, dispatch) => {
    if (target.to > state.doc.content.size) return false;
    if (dispatch === undefined) return true;
    const { schema } = state;
    const written = schema.text(target.url, [schema.marks.link.create({ href: target.url })]);
    dispatch(state.tr.replaceWith(target.from, target.to, schema.nodes.paragraph.createChecked(null, written)));
    return true;
  };
