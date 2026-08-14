import type { Schema } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_SUBPAGE_TYPE } from '../constants/pages.editor.blocks.constants';
import { PAGE_EDITOR_COLLECTION_TYPE } from '../constants/pages.editor.collection.constants';
import type { PageEditorPageShape, PageEditorPageShapeTarget } from '../types/pages.editor.page-shape.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';

/**
 * The page named by the selected block, when there is a choice about how it is
 * shown: a collection kept in sight, or the line that leads to it.
 *
 * Both say the same thing — this page holds that one — and which of the two is
 * wanted depends on whether it is being read or only referred to.
 */
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

/**
 * Shows the page the selected block names the other way round.
 *
 * Nothing is created and nothing is thrown away: the page stays where it is,
 * and what changes is whether this page keeps it in sight or merely points at
 * it. The name is carried across so a line that leads nowhere readable still
 * says what it used to be called.
 */
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
