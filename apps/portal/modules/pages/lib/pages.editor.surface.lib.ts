import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import {
  SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
  SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
} from '../constants/pages.editor.constants';
import type { PageEditorCalloutIconChoice } from '../types/pages.editor.callout-icon.types';
import type {
  PageEditorSpot,
  PageEditorSurfaceRect,
  PageEditorSurfaceState,
} from '../types/pages.editor.surface.types';
import { readPageEditorBlockColors } from './pages.editor.block-color.lib';
import { readPageEditorBlockComments } from './pages.editor.block-comment.lib';
import { isPageEditorBlockDragActive } from './pages.editor.block-drag.lib';
import { readPageEditorBlockId } from './pages.editor.block-link.lib';
import { readPageEditorBlockRequest } from './pages.editor.block-menu.lib';
import { isPageEditorCalloutSelected, readPageEditorCalloutIcon } from './pages.editor.callout-icon.lib';
import { listPageEditorBlockConversions } from './pages.editor.convert.lib';
import { readPageEditorFoldState } from './pages.editor.heading-fold.lib';
import { readPageImageAlignment } from './pages.editor.image.lib';
import { computeSelectionToolbarPlacement } from './pages.editor.lib';
import { countSelectedBlocks } from './pages.editor.selection.lib';
import { isPageEditorInTable } from './pages.editor.table.lib';

const readMenuPosition = (
  view: EditorView,
  state: EditorState,
  surfaceRect: PageEditorSurfaceRect,
): PageEditorSpot | null => {
  const request = readPageEditorBlockRequest(state);
  if (request === null) return null;
  const blockCoords = view.coordsAtPos(request.blockStart);
  return { left: blockCoords.left - surfaceRect.left, top: blockCoords.top - surfaceRect.top };
};

const readToolbarPosition = (
  view: EditorView,
  state: EditorState,
  surfaceRect: PageEditorSurfaceRect,
): PageEditorSpot | null => {
  const isBlockBusy = isPageEditorBlockDragActive(state) || readPageEditorBlockRequest(state) !== null;
  if (isBlockBusy || state.selection.empty) return null;
  const placement = computeSelectionToolbarPlacement({
    selectionEndCoords: view.coordsAtPos(state.selection.to),
    selectionStartCoords: view.coordsAtPos(state.selection.from),
    surfaceRect,
    toolbarHeight: SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
    toolbarWidth: SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
  });
  return { left: placement.left, top: placement.top };
};

/**
 * Everything the page around the editor needs to know after a change: what the
 * selected blocks are wearing, what they can become, what has been said about
 * them, and where the menu and the toolbar belong.
 *
 * It is read in one pass so the page never shows two answers from two
 * different moments.
 */
/** The fold, read for whichever block the menu was opened for. */
const readFoldStateOfRequestedBlock = (state: EditorState): { readonly isFolded: boolean } | null => {
  const request = readPageEditorBlockRequest(state);
  return request === null ? null : readPageEditorFoldState(state.doc, request.blockStart);
};

/** The mark, read only for a callout, so no other block is offered a choice that means nothing to it. */
const readCalloutIconChoice = (state: EditorState): PageEditorCalloutIconChoice | null =>
  isPageEditorCalloutSelected(state) ? { chosen: readPageEditorCalloutIcon(state) } : null;

export const readPageEditorSurface = (
  view: EditorView,
  state: EditorState,
  surfaceRect: PageEditorSurfaceRect | null,
): PageEditorSurfaceState => ({
  blockId: readPageEditorBlockId(state),
  calloutIcon: readCalloutIconChoice(state),
  colors: readPageEditorBlockColors(state),
  imageAlign: readPageImageAlignment(state),
  isInTable: isPageEditorInTable(state),
  comments: readPageEditorBlockComments(state),
  conversions: listPageEditorBlockConversions(state),
  foldState: readFoldStateOfRequestedBlock(state),
  menuPosition: surfaceRect === null ? null : readMenuPosition(view, state, surfaceRect),
  request: readPageEditorBlockRequest(state),
  selectedBlockCount: countSelectedBlocks(state.selection),
  toolbarPosition: surfaceRect === null ? null : readToolbarPosition(view, state, surfaceRect),
});
