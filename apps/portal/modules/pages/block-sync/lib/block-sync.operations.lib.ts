import { BLOCK_SYNC_CHILDREN_PATH, BLOCK_SYNC_COMMAND, BLOCK_SYNC_TABLE } from '../constants/block-sync.constants';
import type {
  BlockCommand,
  BlockListPlacement,
  BlockOperationGroup,
  BlockWireOperation,
} from '../types/block-sync.types';

const buildOperation = (
  command: BlockCommand,
  blockId: string,
  path: readonly string[],
  args: unknown,
): BlockWireOperation => ({ args, command, path, pointer: { id: blockId, table: BLOCK_SYNC_TABLE } });

export const buildSetOperation = (blockId: string, args: unknown): BlockWireOperation =>
  buildOperation(BLOCK_SYNC_COMMAND.set, blockId, [], args);

export const buildUpdateOperation = (blockId: string, path: readonly string[], args: unknown): BlockWireOperation =>
  buildOperation(BLOCK_SYNC_COMMAND.update, blockId, path, args);

export const buildApplyTextOperation = (blockId: string, property: string, update: string): BlockWireOperation =>
  buildOperation(BLOCK_SYNC_COMMAND.applyText, blockId, [], { property, update });

export const buildListRemoveOperation = (parentId: string, childId: string): BlockWireOperation =>
  buildOperation(BLOCK_SYNC_COMMAND.listRemove, parentId, [BLOCK_SYNC_CHILDREN_PATH], { id: childId });

export const buildListInsertOperation = (parentId: string, placement: BlockListPlacement): BlockWireOperation =>
  placement.before === undefined
    ? buildOperation(BLOCK_SYNC_COMMAND.listAfter, parentId, [BLOCK_SYNC_CHILDREN_PATH], {
        id: placement.childId,
        ...(placement.after === undefined ? {} : { after: placement.after }),
      })
    : buildOperation(BLOCK_SYNC_COMMAND.listBefore, parentId, [BLOCK_SYNC_CHILDREN_PATH], {
        before: placement.before,
        id: placement.childId,
      });

/** Splits between groups only, so a created block never lands apart from the list that holds it. */
export const chunkOperationGroups = (
  groups: readonly BlockOperationGroup[],
  maximumOperations: number,
): readonly (readonly BlockWireOperation[])[] => {
  const chunks: BlockWireOperation[][] = [];
  let current: BlockWireOperation[] = [];
  for (const group of groups) {
    if (current.length > 0 && current.length + group.length > maximumOperations) {
      chunks.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string[] => (typeof value === 'string' ? [value] : []);

const listReferencedIds = (args: unknown): string[] => {
  if (!isRecord(args)) return [];
  return [...readString(args.id), ...readString(args.after), ...readString(args.before), ...readString(args.parentId)];
};

/** Every block an operation names, as a pointer or inside its arguments. */
export const listTouchedBlockIds = (operations: readonly BlockWireOperation[]): ReadonlySet<string> =>
  new Set(operations.flatMap((operation) => [operation.pointer.id, ...listReferencedIds(operation.args)]));

export const countOperationsByBlock = (operations: readonly BlockWireOperation[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const operation of operations) counts.set(operation.pointer.id, (counts.get(operation.pointer.id) ?? 0) + 1);
  return counts;
};
