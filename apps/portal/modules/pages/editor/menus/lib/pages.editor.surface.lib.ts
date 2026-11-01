import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { readPageEditorBlockColors } from '../../blocks/lib/pages.editor.block-color.lib';
import {
  readPageEditorFragmentText,
  readPageEditorRequestedBlockId,
} from '../../blocks/lib/pages.editor.block-comment.lib';
import { isPageEditorBlockDragActive } from '../../blocks/lib/pages.editor.block-drag.lib';
import { readPageEditorBlockId } from '../../blocks/lib/pages.editor.block-link.lib';
import { readPageEditorBlockRequest } from '../../blocks/lib/pages.editor.block-menu.lib';
import { listPageEditorBlockConversions } from '../../blocks/lib/pages.editor.convert.lib';
import {
  SELECTION_TOOLBAR_ESTIMATED_HEIGHT_PX,
  SELECTION_TOOLBAR_ESTIMATED_WIDTH_PX,
} from '../../constants/pages.editor.constants';
import { readPageBlockAlignment } from '../../lib/pages.editor.align.lib';
import { computeSelectionToolbarPlacement } from '../../lib/pages.editor.lib';
import { readPageFileDisplay } from '../../media/lib/pages.editor.file.display.lib';
import { readSelectedButton } from '../../structure/lib/pages.editor.button.lib';
import {
  isPageEditorCalloutSelected,
  readPageEditorCalloutIcon,
} from '../../structure/lib/pages.editor.callout-icon.lib';
import { readSyncedTarget } from '../../structure/lib/pages.editor.synced.lib';
import { isPageEditorInTable } from '../../structure/lib/pages.editor.table.lib';
import type { PageEditorCalloutIconChoice } from '../../structure/types/pages.editor.callout-icon.types';
import { readPageEditorFoldState } from '../../text/lib/pages.editor.heading-fold.lib';
import { readPageLinkTarget } from '../../text/lib/pages.editor.link-target.lib';
import { readMarksInUse } from '../../text/lib/pages.editor.marks-in-use.lib';
import { countSelectedBlocks } from '../../text/lib/pages.editor.selection.lib';
import { readPageTextColors } from '../../text/lib/pages.editor.text-color.lib';
import type {
  PageEditorSpot,
  PageEditorSurfaceRect,
  PageEditorSurfaceState,
} from '../types/pages.editor.surface.types';
import { readPageShapeTarget } from './pages.editor.page-shape.lib';

/** Aligned to the block's vertical middle, where the opening buttons sit; the top can be off screen on tall blocks. */
export const readPageEditorMenuSpot = (
  block: { readonly height: number; readonly left: number; readonly top: number },
  surfaceRect: PageEditorSurfaceRect,
): PageEditorSpot => ({
  left: block.left - surfaceRect.left,
  top: block.top + block.height / 2 - surfaceRect.top,
});

const readMenuPosition = (
  view: EditorView,
  state: EditorState,
  surfaceRect: PageEditorSurfaceRect,
): PageEditorSpot | null => {
  const request = readPageEditorBlockRequest(state);
  if (request === null) return null;
  const blockDom = view.nodeDOM(request.blockStart);
  if (blockDom instanceof HTMLElement) return readPageEditorMenuSpot(blockDom.getBoundingClientRect(), surfaceRect);
  const blockCoords = view.coordsAtPos(request.blockStart);
  return readPageEditorMenuSpot(
    { height: blockCoords.bottom - blockCoords.top, left: blockCoords.left, top: blockCoords.top },
    surfaceRect,
  );
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

const readFoldStateOfRequestedBlock = (state: EditorState): { readonly isFolded: boolean } | null => {
  const request = readPageEditorBlockRequest(state);
  return request === null ? null : readPageEditorFoldState(state.doc, request.blockStart);
};

const readCalloutIconChoice = (state: EditorState): PageEditorCalloutIconChoice | null =>
  isPageEditorCalloutSelected(state) ? { chosen: readPageEditorCalloutIcon(state) } : null;

/** Keeps the previous reference so React skips a re-render; JSON equality holds as both are same-order plain data. */
export const keepPageEditorSurfaceIfSame = (
  previous: PageEditorSurfaceState,
  next: PageEditorSurfaceState,
): PageEditorSurfaceState => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next);

const readCommentBlockId = (state: EditorState): string | null => {
  const request = readPageEditorBlockRequest(state);
  return request?.kind === 'comments' ? readPageEditorRequestedBlockId(state, request.blockStart) : null;
};

const readCommentQuote = (state: EditorState): string | null => {
  const request = readPageEditorBlockRequest(state);
  return request?.kind === 'comments' && request.fragment !== undefined
    ? readPageEditorFragmentText(state, request.fragment)
    : null;
};

export const readPageEditorSurface = (
  view: EditorView,
  state: EditorState,
  surfaceRect: PageEditorSurfaceRect | null,
): PageEditorSurfaceState => ({
  blockId: readPageEditorBlockId(state),
  commentBlockId: readCommentBlockId(state),
  commentQuote: readCommentQuote(state),
  calloutIcon: readCalloutIconChoice(state),
  colors: readPageEditorBlockColors(state),
  blockAlign: readPageBlockAlignment(state),
  fileDisplay: readPageFileDisplay(state),
  linkTarget: readPageLinkTarget(state),
  pageShape: readPageShapeTarget(state),
  syncedTarget: readSyncedTarget(state),
  buttonAt: readSelectedButton(state),
  textColors: readPageTextColors(state),
  marksInUse: readMarksInUse(state),
  isInTable: isPageEditorInTable(state),
  conversions: listPageEditorBlockConversions(state),
  foldState: readFoldStateOfRequestedBlock(state),
  menuPosition: surfaceRect === null ? null : readMenuPosition(view, state, surfaceRect),
  request: readPageEditorBlockRequest(state),
  selectedBlockCount: countSelectedBlocks(state.selection),
  toolbarPosition: surfaceRect === null ? null : readToolbarPosition(view, state, surfaceRect),
});
