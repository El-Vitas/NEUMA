import type { Node as EditorNode, ResolvedPos } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_CHILDREN_TYPE,
  PAGE_EDITOR_BLOCK_PROBE_INSET_PX,
  PAGE_EDITOR_COLUMN_ROW_TYPE,
  PAGE_EDITOR_DRAG_SWEEP_REACH_PX,
  PAGE_EDITOR_DRAG_SWEEP_STEP_PX,
  PAGE_EDITOR_PAGE_TYPE,
  PAGE_EDITOR_SIBLING_BLOCK_CONTENT,
  PAGE_EDITOR_TABLE_CELL_TYPE,
} from '../constants/pages.editor.blocks.constants';
import type {
  PageEditorBlockHolder,
  PageEditorDropPointer,
  PageEditorRowColumn,
} from '../types/pages.editor.block-drag.types';

/**
 * Reads which block the pointer is on.
 *
 * Every gesture aimed at a block — hovering it to get its handle, dragging
 * another one onto it — asks this question, and the answer has to survive
 * blocks the editor lays out itself, panels floating over the page and the
 * gaps between blocks.
 */
export const acceptsSiblingBlocks = (node: EditorNode): boolean =>
  node.type.spec.content === PAGE_EDITOR_SIBLING_BLOCK_CONTENT;

/**
 * Holds blocks a person can take on their own.
 *
 * A table is one thing to move, not a stack of cells: its cells keep their
 * blocks for dropping into, but hovering a table hands over the table itself,
 * so it can be moved without hunting for the page margin.
 */
export const offersGrabbableBlocks = (node: EditorNode): boolean =>
  acceptsSiblingBlocks(node) && node.type.name !== PAGE_EDITOR_TABLE_CELL_TYPE;

/**
 * Holds blocks that belong to the page itself, rather than to something drawn
 * inside it. The margin beside the text answers to these: aiming there is how
 * a whole row of columns is taken, instead of one of the blocks inside it.
 */
export const holdsPageBlocks = (node: EditorNode): boolean =>
  node.type.name === PAGE_EDITOR_PAGE_TYPE || node.type.name === PAGE_EDITOR_BLOCK_CHILDREN_TYPE;

export const getPageEditorBlockRect = (view: EditorView, blockStart: number): DOMRect | null => {
  const blockDom = view.nodeDOM(blockStart);
  return blockDom instanceof HTMLElement ? blockDom.getBoundingClientRect() : null;
};

/**
 * Turns a position that sits between two blocks into the start of one of them,
 * preferring the one whose band holds the pointer.
 *
 * Atom blocks — an image, an embed, a collection — have nothing inside, so
 * every reading of a pointer over them lands on such a boundary; without this
 * they would look like no block at all.
 */
export const findBlockStartAtBoundary = (view: EditorView, resolved: ResolvedPos, clientY: number): number | null => {
  const startAfter = resolved.nodeAfter === null ? null : resolved.pos;
  const startBefore = resolved.nodeBefore === null ? null : resolved.pos - resolved.nodeBefore.nodeSize;
  const holdsPointer = (blockStart: number | null): boolean => {
    if (blockStart === null) return false;
    const rect = getPageEditorBlockRect(view, blockStart);
    return rect !== null && clientY >= rect.top && clientY <= rect.bottom;
  };
  if (holdsPointer(startBefore)) return startBefore;
  if (holdsPointer(startAfter)) return startAfter;
  return startAfter ?? startBefore;
};

/**
 * Climbs from a position to the start of the block that owns it, stopping at
 * the first ancestor whose parent `holdsBlocks`.
 */
export const findBlockStartAt = (parameters: {
  readonly clientY: number;
  readonly holdsBlocks: (node: EditorNode) => boolean;
  readonly position: number;
  readonly view: EditorView;
}): number | null => {
  const resolved = parameters.view.state.doc.resolve(parameters.position);
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    if (parameters.holdsBlocks(resolved.node(depth - 1))) return resolved.before(depth);
  }
  return findBlockStartAtBoundary(parameters.view, resolved, parameters.clientY);
};

const findNearestChildBlock = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  containerStart: number,
  container: EditorNode,
): number | null => {
  let nearestStart: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  container.forEach((_child, offset) => {
    const childStart = containerStart + 1 + offset;
    const childRect = getPageEditorBlockRect(view, childStart);
    if (childRect === null) return;
    const distance = Math.abs(pointer.clientY - (childRect.top + childRect.height / 2));
    if (distance >= nearestDistance) return;
    nearestDistance = distance;
    nearestStart = childStart;
  });
  return nearestStart;
};

/**
 * Reads which block of a row of columns the pointer is aiming at.
 *
 * The pointer rarely sits on the text itself: it travels through the gap
 * between columns and along their padding. A point belongs to the first column
 * that has not ended yet — the gap belongs to the column on its right, which
 * is where the handle a person is reaching for is drawn — and inside that
 * column to the block at that height.
 */
const findBlockInsideRow = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  rowStart: number,
  row: EditorNode,
): number | null => {
  const measured: PageEditorRowColumn[] = [];
  row.forEach((column, offset) => {
    const start = rowStart + 1 + offset;
    const rect = getPageEditorBlockRect(view, start);
    if (rect !== null) measured.push({ column, right: rect.right, start });
  });
  const target = measured.find((candidate) => candidate.right >= pointer.clientX) ?? measured.at(-1);
  return target === undefined ? null : findNearestChildBlock(view, pointer, target.start, target.column);
};

/**
 * Reads the block under the pointer from the rendered DOM, walking every
 * element under it rather than just the topmost one, so a floating panel over
 * the page cannot hide the block behind it. When the pointer rests on a
 * container it descends into the child it is closest to, instead of climbing
 * out of the container.
 */
const findBlockUnderPointer = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  holdsBlocks: PageEditorBlockHolder,
): number | null => {
  if (!Number.isFinite(pointer.clientX) || !Number.isFinite(pointer.clientY)) return null;
  const stack = view.dom.ownerDocument.elementsFromPoint(pointer.clientX, pointer.clientY);
  const blockDom = stack
    .map((element) => element.closest('[data-block-id]'))
    .find((candidate) => candidate !== null && view.dom.contains(candidate));
  if (blockDom === undefined || blockDom === null) return null;

  const insidePosition = view.posAtDOM(blockDom, 0);
  const container = view.state.doc.nodeAt(insidePosition - 1);
  if (container !== null && container.type.name === PAGE_EDITOR_COLUMN_ROW_TYPE) {
    return findBlockInsideRow(view, pointer, insidePosition - 1, container);
  }
  if (container !== null && holdsBlocks(container)) {
    return findNearestChildBlock(view, pointer, insidePosition - 1, container);
  }
  return findBlockStartAt({ clientY: pointer.clientY, holdsBlocks, position: insidePosition, view });
};

/**
 * Sweeps a few pixels above and below the pointer when it falls in the gap
 * between two blocks, so a drop aimed at the margin still finds the block it
 * was aimed at instead of reporting no target.
 */
const sweepForBlockNearPointer = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  holdsBlocks: PageEditorBlockHolder,
): number | null => {
  for (
    let offset = PAGE_EDITOR_DRAG_SWEEP_STEP_PX;
    offset <= PAGE_EDITOR_DRAG_SWEEP_REACH_PX;
    offset += PAGE_EDITOR_DRAG_SWEEP_STEP_PX
  ) {
    const above = findBlockUnderPointer(
      view,
      { clientX: pointer.clientX, clientY: pointer.clientY - offset },
      holdsBlocks,
    );
    if (above !== null) return above;
    const below = findBlockUnderPointer(
      view,
      { clientX: pointer.clientX, clientY: pointer.clientY + offset },
      holdsBlocks,
    );
    if (below !== null) return below;
  }
  return null;
};

const probeBlockAtPointer = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  holdsBlocks: PageEditorBlockHolder,
): number | null => {
  if (!Number.isFinite(pointer.clientX) || !Number.isFinite(pointer.clientY)) return null;
  const editorBox = view.dom.getBoundingClientRect();
  const left = Math.min(
    Math.max(pointer.clientX, editorBox.left + PAGE_EDITOR_BLOCK_PROBE_INSET_PX),
    editorBox.right - PAGE_EDITOR_BLOCK_PROBE_INSET_PX,
  );
  const found = view.posAtCoords({ left, top: pointer.clientY });
  if (found === null) return null;
  const aimsAtTheMargin = pointer.clientX < editorBox.left;
  return findBlockStartAt({
    clientY: pointer.clientY,
    holdsBlocks: aimsAtTheMargin ? holdsPageBlocks : holdsBlocks,
    position: found.pos,
    view,
  });
};

/**
 * Reads the block the pointer is aiming at.
 *
 * `holdsBlocks` decides how deep the reading goes, because grabbing and
 * dropping are different questions: a table is grabbed whole, yet a block can
 * still be dropped inside one of its cells.
 */
export const findPageEditorBlockAtPointer = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  holdsBlocks: PageEditorBlockHolder = acceptsSiblingBlocks,
): number | null =>
  findBlockUnderPointer(view, pointer, holdsBlocks) ??
  sweepForBlockNearPointer(view, pointer, holdsBlocks) ??
  probeBlockAtPointer(view, pointer, holdsBlocks);
