import type { PageContent } from '@company-brain/shared';
import { type Node as EditorNode, Fragment } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import { PAGE_EDITOR_BUTTON_TYPE } from '../constants/pages.editor.button.constants';
import type { PageButtonPressed } from '../types/pages.editor.button.types';
import { findSelectedPageBlocks } from './pages.editor.block-range.lib';
import { serializePageEditorDocument } from './pages.editor.lib';
import { pageEditorSchema } from './pages.editor.schema';

/** The button a page is standing on, when what is chosen is one. */
export const readSelectedButton = (state: EditorState): number | null => {
  const range = findSelectedPageBlocks(state);
  if (range === null) return null;
  return range.parent.child(range.startIndex).type.name === PAGE_EDITOR_BUTTON_TYPE ? range.start : null;
};

/** Says which collection a button adds its rows to. */
export const createPageButtonCollectionCommand =
  (at: number, pageId: string, spaceId: string): Command =>
  (state, dispatch) => {
    const node = state.doc.nodeAt(at);
    if (node === null || node.type.name !== PAGE_EDITOR_BUTTON_TYPE) return false;
    if (dispatch === undefined) return true;
    const written = state.tr.setNodeAttribute(at, 'pageId', pageId);
    dispatch(written.setNodeAttribute(at, 'spaceId', spaceId).setNodeAttribute(at, 'deed', 'row'));
    return true;
  };

/** The button that was pressed, and everything it takes to do what it says. */
export const readThePressedButton = (state: EditorState, at: number): PageButtonPressed | null => {
  const node = state.doc.nodeAt(at);
  if (node === null || node.type.name !== PAGE_EDITOR_BUTTON_TYPE) return null;
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

/** Where what a button writes lands, said as a place in the page rather than as a word. */
const findTheSpot = (state: EditorState, pressed: PageButtonPressed): number => {
  if (pressed.place === 'top') return 0;
  if (pressed.place === 'bottom') return state.doc.content.size;
  const node = state.doc.nodeAt(pressed.at);
  return node === null ? state.doc.content.size : pressed.at + node.nodeSize;
};

/**
 * Writes what the button holds where the button says.
 *
 * What lands is a copy, and a copy is nobody: who each block was is left behind,
 * because the same block cannot be written twice into the same page and a remark
 * left on the one inside the button is about that one.
 */
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

/**
 * What the new row is called: the first thing the button would have written.
 *
 * A row with no name is a row nobody can find again, and the button already
 * says what it is for — so what it writes names what it made.
 */
export const readTheRowTitle = (content: Fragment, untitled: string): string => {
  const written = content.firstChild?.textContent.trim() ?? '';
  return written.length > 0 ? written : untitled;
};

/** What the new row holds: everything the button would have written after its first line. */
export const readTheRowContent = (content: Fragment): PageContent => {
  const rest = content.content.slice(1);
  const document =
    rest.length > 0
      ? pageEditorSchema.topNodeType.createChecked(null, rest)
      : pageEditorSchema.topNodeType.createChecked(null, pageEditorSchema.nodes.paragraph.createChecked());
  return serializePageEditorDocument(document);
};
