import type { Fragment } from 'prosemirror-model';
import type { Command, EditorState, Selection, Transaction } from 'prosemirror-state';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_DRAG_SCROLL_STEP_PX,
  PAGE_EDITOR_DRAG_SCROLL_ZONE_PX,
  PAGE_EDITOR_IDLE_DRAG_STATE,
  PAGE_EDITOR_SCROLLABLE_OVERFLOW_VALUES,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockDragState,
  PageEditorBlockDrop,
  PageEditorBlockMove,
  PageEditorBlockRange,
  PageEditorDropPlacement,
  PageEditorDropPointer,
} from '../types/pages.editor.block-drag.types';
import {
  canSplitPageEditorBlockIntoColumns,
  createPageEditorColumnDropCommand,
  findPageEditorColumnSide,
} from './pages.editor.block-columns.lib';
import {
  acceptsSiblingBlocks,
  findPageEditorBlockAtPointer,
  getPageEditorBlockRect,
} from './pages.editor.block-target.lib';
import { pageEditorBlockDragKey } from './pages.editor.plugin-keys.lib';

const getSelectedBlockRange = (state: EditorState): PageEditorBlockRange | null => {
  const range = state.selection.$from.blockRange(state.selection.$to);
  return range === null ? null : { from: range.start, to: range.end };
};

/**
 * Resolves which blocks travel with a drag started from the handle of the
 * block at `blockStart`: that block alone, or every block the current
 * selection spans when the dragged block is one of them.
 */
export const getPageEditorDragRange = (state: EditorState, blockStart: number): PageEditorBlockRange | null => {
  const block = state.doc.nodeAt(blockStart);
  if (block === null) return null;
  const draggedBlock: PageEditorBlockRange = { from: blockStart, to: blockStart + block.nodeSize };
  const selected = getSelectedBlockRange(state);
  if (selected === null || selected.from > blockStart || selected.to <= blockStart) return draggedBlock;
  return selected.to - selected.from > block.nodeSize ? selected : draggedBlock;
};

export const resolvePageEditorDropPosition = (
  state: EditorState,
  parameters: { readonly blockStart: number; readonly placeAfter: boolean },
): number | null => {
  const block = state.doc.nodeAt(parameters.blockStart);
  if (block === null) return null;
  return parameters.placeAfter ? parameters.blockStart + block.nodeSize : parameters.blockStart;
};

export const isPageEditorBlockMoved = (parameters: PageEditorBlockMove): boolean =>
  parameters.copy || parameters.insertAt < parameters.range.from || parameters.insertAt > parameters.range.to;

const canPlaceBlocks = (state: EditorState, insertAt: number, content: Fragment): boolean => {
  const resolved = state.doc.resolve(insertAt);
  const index = resolved.index();
  return acceptsSiblingBlocks(resolved.parent) && resolved.parent.canReplace(index, index, content);
};

const createPlacementSelection = (transaction: Transaction, placement: number, content: Fragment): Selection =>
  content.childCount === 1
    ? NodeSelection.create(transaction.doc, placement)
    : TextSelection.between(transaction.doc.resolve(placement), transaction.doc.resolve(placement + content.size));

/**
 * Builds the command that lands a dragged block — or every block of a
 * multi-block selection — at `insertAt`, moving it or leaving a copy behind.
 *
 * Reports `false` without dispatching when the drop would destroy the page:
 * a block dropped inside itself, a drop that changes nothing, or a placement
 * the schema forbids. The whole move is a single transaction, so one undo
 * restores the previous order.
 */
export const createPageEditorBlockMoveCommand =
  (parameters: PageEditorBlockMove): Command =>
  (state, dispatch) => {
    if (!isPageEditorBlockMoved(parameters)) return false;
    const content = state.doc.slice(parameters.range.from, parameters.range.to).content;
    if (content.childCount === 0 || !canPlaceBlocks(state, parameters.insertAt, content)) return false;
    if (dispatch === undefined) return true;

    const transaction = state.tr;
    if (!parameters.copy) transaction.delete(parameters.range.from, parameters.range.to);
    const placement = transaction.mapping.map(parameters.insertAt);
    transaction.insert(placement, content);
    transaction.setSelection(createPlacementSelection(transaction, placement, content));
    dispatch(transaction.scrollIntoView());
    return true;
  };

/**
 * Turns the pointer position into where the dragged blocks would land: beside
 * the block it hugs, splitting that row into columns, or between two blocks.
 */
export const findPageEditorDropPlacement = (
  view: EditorView,
  pointer: PageEditorDropPointer,
): PageEditorDropPlacement | null => {
  const blockStart = findPageEditorBlockAtPointer(view, pointer);
  if (blockStart === null) return null;
  const blockRect = getPageEditorBlockRect(view, blockStart);
  if (blockRect === null) return null;

  const side = findPageEditorColumnSide({ blockRect, clientX: pointer.clientX });
  if (side !== null && canSplitPageEditorBlockIntoColumns(view.state, blockStart)) {
    return { blockStart, kind: 'column', side };
  }
  const insertAt = resolvePageEditorDropPosition(view.state, {
    blockStart,
    placeAfter: pointer.clientY > blockRect.top + blockRect.height / 2,
  });
  return insertAt === null ? null : { insertAt, kind: 'between' };
};

/** Applies whichever kind of drop the pointer resolved to. */
export const createPageEditorBlockDropCommand = (parameters: PageEditorBlockDrop): Command =>
  parameters.placement.kind === 'column'
    ? createPageEditorColumnDropCommand({
        blockStart: parameters.placement.blockStart,
        copy: parameters.copy,
        range: parameters.range,
        side: parameters.placement.side,
      })
    : createPageEditorBlockMoveCommand({
        copy: parameters.copy,
        insertAt: parameters.placement.insertAt,
        range: parameters.range,
      });

export const isPageEditorDropUseful = (parameters: PageEditorBlockDrop): boolean =>
  parameters.placement.kind === 'column' ||
  isPageEditorBlockMoved({ copy: parameters.copy, insertAt: parameters.placement.insertAt, range: parameters.range });

export const computePageEditorAutoScrollStep = (parameters: {
  readonly clientY: number;
  readonly viewportHeight: number;
}): number => {
  if (parameters.clientY < PAGE_EDITOR_DRAG_SCROLL_ZONE_PX) return -PAGE_EDITOR_DRAG_SCROLL_STEP_PX;
  if (parameters.clientY > parameters.viewportHeight - PAGE_EDITOR_DRAG_SCROLL_ZONE_PX) {
    return PAGE_EDITOR_DRAG_SCROLL_STEP_PX;
  }
  return 0;
};

const findScrollableAncestor = (element: HTMLElement | null): HTMLElement | null => {
  for (let current = element; current !== null; current = current.parentElement) {
    const overflowY = globalThis.getComputedStyle(current).overflowY;
    if (PAGE_EDITOR_SCROLLABLE_OVERFLOW_VALUES.has(overflowY) && current.scrollHeight > current.clientHeight) {
      return current;
    }
  }
  return null;
};

export const scrollPageWhileDragging = (view: EditorView, clientY: number): void => {
  const step = computePageEditorAutoScrollStep({ clientY, viewportHeight: globalThis.innerHeight });
  if (step === 0) return;
  const scrollable = findScrollableAncestor(view.dom.parentElement);
  if (scrollable === null) globalThis.scrollBy(0, step);
  else scrollable.scrollBy(0, step);
};

export const readPageEditorDragState = (view: EditorView): PageEditorBlockDragState =>
  pageEditorBlockDragKey.getState(view.state) ?? PAGE_EDITOR_IDLE_DRAG_STATE;

export const writePageEditorDragState = (view: EditorView, next: PageEditorBlockDragState): void => {
  view.dispatch(view.state.tr.setMeta(pageEditorBlockDragKey, next));
};

export const isPageEditorBlockDragActive = (state: EditorState): boolean =>
  (pageEditorBlockDragKey.getState(state)?.range ?? null) !== null;

/**
 * Arms a drag for the block at `blockStart`, or for every block of the current
 * selection when that block is one of them.
 *
 * The drag only becomes visible once the pointer moves, so a plain click on
 * the handle still just selects the block. Reports the blocks that would
 * travel, so the caller can tell a single-block grab from a multi-block one.
 */
export const armPageEditorBlockDrag = (view: EditorView, blockStart: number): PageEditorBlockRange | null => {
  const range = getPageEditorDragRange(view.state, blockStart);
  if (range === null) return null;
  writePageEditorDragState(view, { placement: null, range });
  return range;
};
