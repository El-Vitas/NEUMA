import type { Schema } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_SUBPAGE_TYPE } from '../../blocks/constants/pages.editor.blocks.constants';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import { PAGE_EDITOR_COLLECTION_TYPE } from '../../structure/constants/pages.editor.collection.constants';
import type { PageEditorPageShape, PageEditorPageShapeTarget } from '../types/pages.editor.page-shape.types';

export const readPageShapeTarget = (state: EditorState): PageEditorPageShapeTarget | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  const node = range.parent.child(range.startIndex);
  const shown = node.type.name;
  if (shown !== PAGE_EDITOR_COLLECTION_TYPE && shown !== PAGE_EDITOR_SUBPAGE_TYPE) return null;
  if (typeof node.attrs.pageId !== 'string' || typeof node.attrs.spaceId !== 'string') return null;
  return {
    chosen: shown === PAGE_EDITOR_COLLECTION_TYPE ? 'collection' : 'link',
    label: typeof node.attrs.label === 'string' ? node.attrs.label : null,
    pageId: node.attrs.pageId,
    position: range.start,
    spaceId: node.attrs.spaceId,
  };
};

/** Swaps the block's shape without creating or deleting the referenced page; the label is carried across. */
export const createPageShapeCommand =
  (schema: Schema, shape: PageEditorPageShape, target: PageEditorPageShapeTarget, viewName: string | null): Command =>
  (state, dispatch) => {
    const wanted = shape === 'collection' ? schema.nodes.collection : schema.nodes.subpage;
    if (wanted === undefined) return false;
    const node = state.doc.nodeAt(target.position);
    if (node === null) return false;
    if (dispatch === undefined) return true;

    const attrs =
      shape === 'collection'
        ? { pageId: target.pageId, spaceId: target.spaceId, viewName }
        : { label: target.label ?? target.pageId, pageId: target.pageId, spaceId: target.spaceId };
    dispatch(state.tr.replaceWith(target.position, target.position + node.nodeSize, wanted.createChecked(attrs)));
    return true;
  };
