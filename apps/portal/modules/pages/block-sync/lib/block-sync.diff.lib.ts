import { BLOCK_SYNC_BAG } from '../constants/block-sync.constants';
import type {
  BlockJsonObject,
  BlockOperationGroup,
  BlockSnapshot,
  BlockSnapshotMap,
  BlockTextWriter,
  BlockWireOperation,
  BlockDiffInput as DiffInput,
  BlockListPlacement as ListPlacement,
} from '../types/block-sync.types';
import {
  buildApplyTextOperation,
  buildListInsertOperation,
  buildListRemoveOperation,
  buildSetOperation,
  buildUpdateOperation,
} from './block-sync.operations.lib';
import { isRichTextValue } from './block-sync.snapshot.lib';
import { toStableJson } from './block-sync.text.lib';

const isSame = (first: unknown, second: unknown): boolean => toStableJson(first) === toStableJson(second);

const listPreOrder = (next: BlockSnapshotMap, pageId: string): readonly string[] => {
  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string): void => {
    const block = next.get(id);
    if (block === undefined || visited.has(id)) return;
    visited.add(id);
    order.push(id);
    for (const childId of block.children) visit(childId);
  };
  visit(pageId);
  return order;
};

/** The nearest sibling before the child that the list holds and the server lists as live. */
const findAnchorBefore = (
  nextChildren: readonly string[],
  index: number,
  working: readonly string[],
  isAnchor: (blockId: string) => boolean,
): string | undefined =>
  nextChildren.slice(0, index).findLast((sibling) => working.includes(sibling) && isAnchor(sibling));

const placeChild = (
  childId: string,
  anchors: { readonly after: string | undefined; readonly before: string | undefined },
  isListEmpty: boolean,
): ListPlacement => {
  if (anchors.after !== undefined) return { after: anchors.after, childId };
  if (anchors.before !== undefined) return { before: anchors.before, childId };
  return isListEmpty ? { childId } : { atStart: true, childId };
};

/**
 * Where each child of a parent must be listed so that the server list ends up in the new order. A child that
 * is already in its place needs nothing; one that is not goes after the nearest sibling the server lists as live,
 * or before the first such sibling. A sibling the server does not list is never an anchor: the server sends a
 * child whose anchor it cannot find to the end of the list.
 */
const planPlacements = (
  previousChildren: readonly string[],
  nextChildren: readonly string[],
  canAnchor: (blockId: string) => boolean,
): Map<string, ListPlacement> => {
  const kept = new Set(nextChildren);
  const known = new Set(previousChildren);
  const isAnchor = (blockId: string): boolean => !known.has(blockId) || canAnchor(blockId);
  const working = previousChildren.filter((id) => kept.has(id));
  const placements = new Map<string, ListPlacement>();
  for (const [index, childId] of nextChildren.entries()) {
    if (working[index] === childId) continue;
    const after = findAnchorBefore(nextChildren, index, working, isAnchor);
    const before = working.find((sibling) => sibling !== childId && isAnchor(sibling));
    const isListEmpty = working.every((sibling) => sibling === childId);
    placements.set(childId, placeChild(childId, { after, before }, isListEmpty));
    const without = working.filter((id) => id !== childId);
    working.splice(0, working.length, ...without.slice(0, index), childId, ...without.slice(index));
  }
  return placements;
};

const buildCreationOperations = (block: BlockSnapshot, text: BlockTextWriter): readonly BlockWireOperation[] => {
  const richKeys = Object.keys(block.properties).filter((key) => isRichTextValue(block.properties[key]));
  const properties = Object.fromEntries(
    Object.entries(block.properties).map(([key, value]) => [key, isRichTextValue(value) ? [] : value]),
  );
  const creation = buildSetOperation(block.id, {
    id: block.id,
    parentId: block.parentId,
    type: block.type,
    ...(Object.keys(block.properties).length === 0 ? {} : { properties }),
    ...(Object.keys(block.format).length === 0 ? {} : { format: block.format }),
  });
  const texts = richKeys.flatMap((key): BlockWireOperation[] => {
    const value = block.properties[key];
    const update = isRichTextValue(value) && value.length > 0 ? text.write(block.id, key, value) : null;
    return update === null ? [] : [buildApplyTextOperation(block.id, key, update)];
  });
  return [creation, ...texts];
};

const listKeys = (first: BlockJsonObject, second: BlockJsonObject): readonly string[] => [
  ...new Set([...Object.keys(first), ...Object.keys(second)]),
];

const buildFormatOperations = (previous: BlockSnapshot, next: BlockSnapshot): readonly BlockWireOperation[] => {
  const patch = Object.fromEntries(
    listKeys(previous.format, next.format)
      .filter((key) => !isSame(previous.format[key], next.format[key]))
      .map((key) => [key, next.format[key] ?? null]),
  );
  return Object.keys(patch).length === 0 ? [] : [buildUpdateOperation(next.id, [BLOCK_SYNC_BAG.format], patch)];
};

const isTextChange = (previous: unknown, next: unknown): boolean =>
  (isRichTextValue(previous) || previous === undefined) && isRichTextValue(next);

const buildPropertyOperations = (
  previous: BlockSnapshot,
  next: BlockSnapshot,
  text: BlockTextWriter,
): readonly BlockWireOperation[] => {
  const patch: Record<string, unknown> = {};
  const texts: BlockWireOperation[] = [];
  for (const key of listKeys(previous.properties, next.properties)) {
    const before = previous.properties[key];
    const after = next.properties[key];
    if (isSame(before, after)) continue;
    if (isTextChange(before, after) && isRichTextValue(after) && text.canWrite(next.id, key)) {
      const update = text.write(next.id, key, after);
      if (update !== null) texts.push(buildApplyTextOperation(next.id, key, update));
    } else {
      patch[key] = after ?? null;
    }
  }
  const properties =
    Object.keys(patch).length === 0 ? [] : [buildUpdateOperation(next.id, [BLOCK_SYNC_BAG.properties], patch)];
  return [...properties, ...texts];
};

const buildFieldOperations = (previous: BlockSnapshot, next: BlockSnapshot): readonly BlockWireOperation[] => {
  const patch = {
    ...(previous.type === next.type ? {} : { type: next.type }),
    ...(previous.parentId === next.parentId ? {} : { parentId: next.parentId }),
  };
  return Object.keys(patch).length === 0 ? [] : [buildUpdateOperation(next.id, [], patch)];
};

/**
 * A block the server holds dead and the document has again, as when a deletion is undone. It already exists there,
 * so it is made alive under its parent and given what changed since it was deleted; a create would be refused.
 */
const buildRevivalOperations = (
  dead: BlockSnapshot,
  block: BlockSnapshot,
  text: BlockTextWriter,
): readonly BlockWireOperation[] => [
  buildUpdateOperation(block.id, [], {
    alive: true,
    parentId: block.parentId,
    ...(dead.type === block.type ? {} : { type: block.type }),
  }),
  ...buildPropertyOperations(dead, block, text),
  ...buildFormatOperations(dead, block),
];

const buildRemovalGroup = (block: BlockSnapshot): BlockOperationGroup => [
  buildUpdateOperation(block.id, [], { alive: false }),
  ...(block.parentId === null ? [] : [buildListRemoveOperation(block.parentId, block.id)]),
];

/**
 * The operations that turn the blocks of `previous` into those of `next`. Blocks are visited parent first, so a
 * block is created after its parent and listed after its neighbour. Each block's operations form one group.
 */
export const diffSnapshots = ({
  buried,
  canAnchor = () => true,
  next,
  pageId,
  previous,
  text,
}: DiffInput): readonly BlockOperationGroup[] => {
  const placementsByParent = new Map<string, Map<string, ListPlacement>>();
  const readPlacement = (parentId: string, childId: string): ListPlacement | undefined => {
    const cached = placementsByParent.get(parentId);
    if (cached !== undefined) return cached.get(childId);
    const planned = planPlacements(
      previous.get(parentId)?.children ?? [],
      next.get(parentId)?.children ?? [],
      canAnchor,
    );
    placementsByParent.set(parentId, planned);
    return planned.get(childId);
  };

  const buildGroup = (block: BlockSnapshot): BlockOperationGroup => {
    const before = previous.get(block.id);
    const placement = block.parentId === null ? undefined : readPlacement(block.parentId, block.id);
    const hasMoved = before !== undefined && before.parentId !== block.parentId;
    const insert =
      placement === undefined || block.parentId === null ? [] : [buildListInsertOperation(block.parentId, placement)];
    const dead = buried?.get(block.id);
    if (before === undefined && dead !== undefined) return [...buildRevivalOperations(dead, block, text), ...insert];
    if (before === undefined) return [...buildCreationOperations(block, text), ...insert];
    const leave = hasMoved && before.parentId !== null ? [buildListRemoveOperation(before.parentId, block.id)] : [];
    return [
      ...buildFieldOperations(before, block),
      ...buildPropertyOperations(before, block, text),
      ...buildFormatOperations(before, block),
      ...leave,
      ...insert,
    ];
  };

  const present = listPreOrder(next, pageId)
    .filter((id) => id !== pageId)
    .flatMap((id) => {
      const block = next.get(id);
      return block === undefined ? [] : [buildGroup(block)];
    });
  const removed = [...previous.values()]
    .filter((block) => block.id !== pageId && !next.has(block.id))
    .map(buildRemovalGroup);
  return [...present, ...removed].filter((group) => group.length > 0);
};
