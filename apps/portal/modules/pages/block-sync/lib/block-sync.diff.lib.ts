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

/**
 * Where each child of a parent must be listed so that the server list ends up in the new order. A child that
 * is already in its place needs nothing; one that is not goes after its new neighbour, or before the first.
 */
const planPlacements = (
  previousChildren: readonly string[],
  nextChildren: readonly string[],
): Map<string, ListPlacement> => {
  const kept = new Set(nextChildren);
  const working = previousChildren.filter((id) => kept.has(id));
  const placements = new Map<string, ListPlacement>();
  for (const [index, childId] of nextChildren.entries()) {
    if (working[index] === childId) continue;
    const before = working[0];
    const after = nextChildren[index - 1];
    if (index === 0) placements.set(childId, before === undefined ? { childId } : { before, childId });
    else placements.set(childId, { after, childId });
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

const buildRemovalGroup = (block: BlockSnapshot): BlockOperationGroup => [
  buildUpdateOperation(block.id, [], { alive: false }),
  ...(block.parentId === null ? [] : [buildListRemoveOperation(block.parentId, block.id)]),
];

/**
 * The operations that turn the blocks of `previous` into those of `next`. Blocks are visited parent first, so a
 * block is created after its parent and listed after its neighbour. Each block's operations form one group.
 */
export const diffSnapshots = ({ next, pageId, previous, text }: DiffInput): readonly BlockOperationGroup[] => {
  const placementsByParent = new Map<string, Map<string, ListPlacement>>();
  const readPlacement = (parentId: string, childId: string): ListPlacement | undefined => {
    const cached = placementsByParent.get(parentId);
    if (cached !== undefined) return cached.get(childId);
    const planned = planPlacements(previous.get(parentId)?.children ?? [], next.get(parentId)?.children ?? []);
    placementsByParent.set(parentId, planned);
    return planned.get(childId);
  };

  const buildGroup = (block: BlockSnapshot): BlockOperationGroup => {
    const before = previous.get(block.id);
    const placement = block.parentId === null ? undefined : readPlacement(block.parentId, block.id);
    const hasMoved = before !== undefined && before.parentId !== block.parentId;
    const insert =
      placement === undefined || block.parentId === null ? [] : [buildListInsertOperation(block.parentId, placement)];
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
