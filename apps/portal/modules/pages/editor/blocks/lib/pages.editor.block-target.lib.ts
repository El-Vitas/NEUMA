import type { Node as EditorNode, ResolvedPos } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import {
  PAGE_EDITOR_BLOCK_CHILDREN_TYPE,
  PAGE_EDITOR_BLOCK_GROUP,
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

export const acceptsSiblingBlocks = (node: EditorNode): boolean =>
  node.type.spec.content === PAGE_EDITOR_SIBLING_BLOCK_CONTENT;

/**
 * Only pure containers hand over their children; a quote, callout or toggle is itself one thing to move.
 * Table cells are excluded so hovering a table grabs the table, though blocks can still be dropped into cells.
 */
export const offersGrabbableBlocks = (node: EditorNode): boolean =>
  acceptsSiblingBlocks(node) &&
  node.type.spec.group !== PAGE_EDITOR_BLOCK_GROUP &&
  node.type.name !== PAGE_EDITOR_TABLE_CELL_TYPE;

/** The margin answers to these, so aiming there takes a whole column row instead of a block inside it. */
export const holdsPageBlocks = (node: EditorNode): boolean =>
  node.type.name === PAGE_EDITOR_PAGE_TYPE || node.type.name === PAGE_EDITOR_BLOCK_CHILDREN_TYPE;

export const getPageEditorBlockRect = (view: EditorView, blockStart: number): DOMRect | null => {
  const blockDom = view.nodeDOM(blockStart);
  return blockDom instanceof HTMLElement ? blockDom.getBoundingClientRect() : null;
};

/** Atom blocks (image, embed, collection) have no inside, so a pointer over them always resolves to a boundary. */
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

/** The gap between columns belongs to the column on its right, where the handle being reached for is drawn. */
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

/** Walks every element under the pointer, not just the topmost, so a floating panel cannot hide the block. */
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

/** Probes a few pixels above and below so a drop in the gap between blocks still finds a target. */
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

/** Matches by row so the buttons do not vanish when the pointer is past a short line or in the margin. */
export const findPageEditorBlockOnPointerRow = (view: EditorView, clientY: number): number | null => {
  let found: number | null = null;
  view.state.doc.forEach((_node, offset) => {
    if (found !== null) return;
    const rect = getPageEditorBlockRect(view, offset);
    if (rect !== null && clientY >= rect.top && clientY <= rect.bottom) found = offset;
  });
  return found;
};

/** `holdsBlocks` sets the depth: a table is grabbed whole, yet blocks can be dropped inside its cells. */
export const findPageEditorBlockAtPointer = (
  view: EditorView,
  pointer: PageEditorDropPointer,
  holdsBlocks: PageEditorBlockHolder = acceptsSiblingBlocks,
): number | null =>
  findBlockUnderPointer(view, pointer, holdsBlocks) ??
  sweepForBlockNearPointer(view, pointer, holdsBlocks) ??
  probeBlockAtPointer(view, pointer, holdsBlocks);
