import type { PageContent, PageContentNode } from '@neuma/shared';
import type { Node as EditorNode, Schema } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_SYNCED_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import type { PageSyncedReference } from '../types/pages.editor.synced.types';

const isTheBlock = (node: PageContentNode, blockId: string): boolean =>
  'attrs' in node && typeof node.attrs?.id === 'string' && node.attrs.id === blockId;

const findTheBlock = (nodes: readonly PageContentNode[], blockId: string): PageContentNode | null => {
  for (const node of nodes) {
    if (isTheBlock(node, blockId)) return node;
    const held = 'content' in node && Array.isArray(node.content) ? findTheBlock(node.content, blockId) : null;
    if (held !== null) return held;
  }
  return null;
};

/** Reads from the already loaded pages, so drawing never waits on a server request. */
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

export const readSyncedTarget = (state: EditorState): PageSyncedReference | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  if (node.type.name !== PAGE_EDITOR_SYNCED_TYPE) return null;
  return { blockId: node.attrs.blockId, pageId: node.attrs.pageId, position: range.start, spaceId: node.attrs.spaceId };
};

export const buildSyncedBlockContent = (reference: Omit<PageSyncedReference, 'position'>): PageContent => ({
  content: [{ attrs: { ...reference }, type: 'synced' }],
  schemaVersion: 1,
  type: 'doc',
});

/** Drops id and comments: they belong to the original block, and one block cannot be two. */
const asACopy = (borrowed: EditorNode): EditorNode =>
  borrowed.type.create({ ...borrowed.attrs, comments: null, id: null }, borrowed.content, borrowed.marks);

/** Replaces the synced block with an independent copy of the original. */
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
