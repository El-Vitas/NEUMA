import type { PageContent } from '@neuma/shared';
import { type Node as EditorNode, Fragment } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { findSelectedPageBlocks } from '../../blocks/lib/pages.editor.block-range.lib';
import { serializePageEditorDocument } from '../../lib/pages.editor.lib';
import { pageEditorSchema } from '../../lib/pages.editor.schema';
import { PAGE_EDITOR_BUTTON_TYPE } from '../constants/pages.editor.button.constants';
import type { PageButtonPressed } from '../types/pages.editor.button.types';

export const readSelectedButton = (state: EditorState): number | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  return range.parent.child(range.startIndex).type.name === PAGE_EDITOR_BUTTON_TYPE ? range.start : null;
};

export const createPageButtonCollectionCommand =
  (at: number, pageId: string, spaceId: string): Command =>
  (state, dispatch) => {
    const node = state.doc.nodeAt(at);
    if (node?.type.name !== PAGE_EDITOR_BUTTON_TYPE) return false;
    if (dispatch === undefined) return true;
    const written = state.tr.setNodeAttribute(at, 'pageId', pageId);
    dispatch(written.setNodeAttribute(at, 'spaceId', spaceId).setNodeAttribute(at, 'deed', 'row'));
    return true;
  };

export const readThePressedButton = (state: EditorState, at: number): PageButtonPressed | null => {
  const node = state.doc.nodeAt(at);
  if (node?.type.name !== PAGE_EDITOR_BUTTON_TYPE) return null;
  return {
    at,
    content: node.content,
    deed: node.attrs.deed === 'row' ? 'row' : 'blocks',
    label: node.attrs.label,
    pageId: typeof node.attrs.pageId === 'string' ? node.attrs.pageId : null,
    place: node.attrs.place === 'top' || node.attrs.place === 'bottom' ? node.attrs.place : 'below',
    spaceId: typeof node.attrs.spaceId === 'string' ? node.attrs.spaceId : null,
  };
};

const findTheSpot = (state: EditorState, pressed: PageButtonPressed): number => {
  if (pressed.place === 'top') return 0;
  if (pressed.place === 'bottom') return state.doc.content.size;
  const node = state.doc.nodeAt(pressed.at);
  return node === null ? state.doc.content.size : pressed.at + node.nodeSize;
};

/** Copies drop ids and comments: an id cannot repeat on a page and comments belong to the original block. */
const asFreshBlocks = (content: Fragment): Fragment =>
  Fragment.fromArray(
    content.content.map((block: EditorNode) =>
      block.type.create({ ...block.attrs, comments: null, id: null }, block.content, block.marks),
    ),
  );

export const createPageButtonWriteCommand =
  (pressed: PageButtonPressed): Command =>
  (state, dispatch) => {
    if (pressed.content.childCount === 0) return false;
    if (dispatch === undefined) return true;
    const spot = findTheSpot(state, pressed);
    dispatch(state.tr.insert(spot, asFreshBlocks(pressed.content)).scrollIntoView());
    return true;
  };

export const readTheRowTitle = (content: Fragment, untitled: string): string => {
  const written = content.firstChild?.textContent.trim() ?? '';
  return written.length > 0 ? written : untitled;
};

export const readTheRowContent = (content: Fragment): PageContent => {
  const rest = content.content.slice(1);
  const document =
    rest.length > 0
      ? pageEditorSchema.topNodeType.createChecked(null, rest)
      : pageEditorSchema.topNodeType.createChecked(null, pageEditorSchema.nodes.paragraph.createChecked());
  return serializePageEditorDocument(document);
};
