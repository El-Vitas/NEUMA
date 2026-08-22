import type { PageContent, PageContentNode } from '@company-brain/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_SYNCED_TYPE } from '../constants/pages.editor.blocks.constants';
import type { PageSyncedReference } from '../types/pages.editor.synced.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { pageEditorSchema } from './pages.editor.schema';

const isTheBlock = (node: PageContentNode, blockId: string): boolean =>
  'attrs' in node && typeof node.attrs?.id === 'string' && node.attrs.id === blockId;

/** Looks for the block through everything the page holds, however deeply it is held. */
const findTheBlock = (nodes: readonly PageContentNode[], blockId: string): PageContentNode | null => {
  for (const node of nodes) {
    if (isTheBlock(node, blockId)) return node;
    const held = 'content' in node && Array.isArray(node.content) ? findTheBlock(node.content, blockId) : null;
    if (held !== null) return held;
  }
  return null;
};

/**
 * The block a synced one is showing, read from the page it lives in.
 *
 * The pages of the space are already at hand, so what is shown is what that
 * page said the last time it was read here: a borrowed block is never a
 * question asked of a server in the middle of drawing a page.
 */
export const readBorrowedBlock = (
  pages: readonly { readonly content: PageContent; readonly id: string }[],
  pageId: string,
  blockId: string,
): EditorNode | null => {
  const page = pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) return null;
  const found = findTheBlock(page.content.content, blockId);
  if (found === null) return null;
  try {
    return pageEditorSchema.nodeFromJSON(found);
  } catch {
    return null;
  }
};

/** The page and block a chosen synced block is showing, when one is chosen. */
export const readSyncedTarget = (state: EditorState): PageSyncedReference | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  if (node.type.name !== PAGE_EDITOR_SYNCED_TYPE) return null;
  return { blockId: node.attrs.blockId, pageId: node.attrs.pageId, position: range.start, spaceId: node.attrs.spaceId };
};

/** The page that is sent to another page: one block, showing the one that stays here. */
export const buildSyncedBlockContent = (reference: Omit<PageSyncedReference, 'position'>): PageContent => ({
  content: [{ attrs: { ...reference }, type: 'synced' }],
  schemaVersion: 1,
  type: 'doc',
});

/**
 * A copy that is nobody else's: the writing is the same, but who it is and what
 * was said about it are not carried over — a remark left on the block that
 * stays belongs to that block, and one block cannot be two.
 */
const asACopy = (borrowed: EditorNode): EditorNode =>
  borrowed.type.create({ ...borrowed.attrs, comments: null, id: null }, borrowed.content, borrowed.marks);

/**
 * Breaks the tie and leaves what was borrowed as writing of this page.
 *
 * What is left behind is a copy, not the block itself: from then on the two are
 * strangers, and neither hears about the other again.
 */
export const createPageUnsyncCommand =
  (schema: Schema, target: PageSyncedReference, borrowed: EditorNode | null): Command =>
  (state, dispatch) => {
    const node = state.doc.nodeAt(target.position);
    if (node?.type.name !== PAGE_EDITOR_SYNCED_TYPE) return false;
    const kept = borrowed === null ? schema.nodes.paragraph.createChecked() : asACopy(borrowed);
    if (dispatch === undefined) return true;
    dispatch(state.tr.replaceWith(target.position, target.position + node.nodeSize, kept));
    return true;
  };
