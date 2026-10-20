import { PAGE_LIFECYCLE, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import { BLOCK_NO_PAGE_COLUMNS } from './block.page-operation.constants';
import type {
  BlockJsonObject,
  BlockOperation,
  BlockPageColumns,
  BlockPageOperation,
  ExpandedOperations,
  PageOperationAuthor,
  WorkingBlock,
} from './block.transaction.domain.types';
import { BlockOperationInvalidError } from './block.transaction.error';

const withPageColumns = (block: WorkingBlock, changes: Partial<BlockPageColumns>): WorkingBlock => ({
  ...block,
  page: { ...(block.page ?? BLOCK_NO_PAGE_COLUMNS), ...changes },
});

const isRecord = (value: unknown): value is BlockJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeValues = (block: WorkingBlock, changes: BlockJsonObject): BlockJsonObject => {
  const current = isRecord(block.properties.values) ? block.properties.values : {};
  const merged = { ...current, ...changes };
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== null));
};

const setLifecycle = (
  block: WorkingBlock,
  operation: Extract<BlockPageOperation, { command: 'setLifecycle' }>,
  author: PageOperationAuthor,
): WorkingBlock =>
  operation.lifecycle === PAGE_LIFECYCLE.TRASHED
    ? withPageColumns({ ...block, lifecycle: PAGE_LIFECYCLE.TRASHED }, { purgeAfter: null, trashedAt: author.now })
    : withPageColumns({ ...block, lifecycle: PAGE_LIFECYCLE.ACTIVE }, { purgeAfter: null, trashedAt: null });

/** One page command on one page. The version, the editor and the text are settled afterwards, as for any block. */
export const applyPageOperation = (
  block: WorkingBlock,
  operation: BlockPageOperation,
  author: PageOperationAuthor,
): Result<WorkingBlock, DomainError> => {
  switch (operation.command) {
    case 'setLifecycle':
      return Result.ok(setLifecycle(block, operation, author));
    case 'setLock':
      return Result.ok(
        withPageColumns(
          { ...block, lockedAt: operation.isLocked ? author.now : null },
          { lockedById: operation.isLocked ? author.userId : null },
        ),
      );
    case 'setVerification':
      return Result.ok(
        withPageColumns(block, {
          verificationExpiresAt: operation.isVerified ? operation.expiresAt : null,
          verifiedAt: operation.isVerified ? author.now : null,
          verifiedById: operation.isVerified ? author.userId : null,
        }),
      );
    case 'setOwner':
      return Result.ok(withPageColumns(block, { ownerId: operation.ownerId }));
    case 'mergePageValues':
    case 'rewritePageValues':
      return Result.ok({ ...block, properties: { ...block.properties, values: mergeValues(block, operation.values) } });
    case 'moveToSpaceRoot':
      return Result.ok({ ...block, parentId: null, spaceId: operation.spaceId });
    case 'followToSpace':
      return Result.ok({ ...block, spaceId: operation.spaceId });
    default:
      return Result.fail(new BlockOperationInvalidError('The operation is not known'));
  }
};

export const isPageOperation = (operation: BlockOperation): operation is BlockPageOperation => {
  switch (operation.command) {
    case 'setLifecycle':
    case 'setLock':
    case 'setVerification':
    case 'setOwner':
    case 'mergePageValues':
    case 'rewritePageValues':
    case 'moveToSpaceRoot':
    case 'followToSpace':
      return true;
    default:
      return false;
  }
};

const listDescendants = (rootId: string, rows: readonly WorkingBlock[]): WorkingBlock[] => {
  const childrenByParent = new Map<string, WorkingBlock[]>();
  for (const row of rows) {
    if (row.parentId === null) continue;
    childrenByParent.set(row.parentId, [...(childrenByParent.get(row.parentId) ?? []), row]);
  }
  const descendants: WorkingBlock[] = [];
  const pending = [...(childrenByParent.get(rootId) ?? [])];
  for (let block = pending.pop(); block !== undefined; block = pending.pop()) {
    descendants.push(block);
    pending.push(...(childrenByParent.get(block.id) ?? []));
  }
  return descendants;
};

const detach = (blockId: string, parentId: string | null): BlockOperation[] =>
  parentId === null
    ? []
    : [
        { blockId, command: 'patchFields', patch: { parentId: null } },
        { blockId: parentId, childId: blockId, command: 'removeChild' },
      ];

const expandOperation = (operation: BlockOperation, rows: readonly WorkingBlock[]): BlockOperation[] => {
  if (operation.command === 'setLifecycle')
    return [...detach(operation.blockId, operation.detachFromParentId), operation];
  if (operation.command !== 'moveToSpaceRoot') return [operation];
  const followers = [operation.blockId, ...listDescendants(operation.blockId, rows).map((row) => row.id)];
  return [
    ...detach(operation.blockId, operation.detachFromParentId),
    ...followers.map((blockId): BlockOperation => ({ blockId, command: 'followToSpace', spaceId: operation.spaceId })),
    operation,
    ...place(operation),
  ];
};

/** Where the page lands in its new space: under the page that holds it, or in the list of the space. */
const place = (operation: Extract<BlockOperation, { command: 'moveToSpaceRoot' }>): BlockOperation[] => {
  const placement = { anchorId: operation.afterId, side: 'after' } as const;
  if (operation.parentId === null) {
    return [{ blockId: operation.blockId, command: 'insertRoot', placement, spaceId: operation.spaceId }];
  }
  return [
    { blockId: operation.blockId, command: 'patchFields', patch: { parentId: operation.parentId } },
    { blockId: operation.parentId, childId: operation.blockId, command: 'insertChild', placement },
  ];
};

const isRelocation = (operation: BlockOperation): boolean =>
  operation.command === 'moveToSpaceRoot' ||
  (operation.command === 'setLifecycle' && operation.detachFromParentId !== null);

/**
 * A page that goes to the root of its space, or whose branch changes space, is placed by the command itself: the
 * old parent loses it, and every block below follows it to the new space. Nothing below needs a check of its own.
 */
export const expandPageOperations = (
  operations: readonly BlockOperation[],
  rows: readonly WorkingBlock[],
): ExpandedOperations => ({
  operations: operations.flatMap((operation) => expandOperation(operation, rows)),
  placedIds: new Set(operations.filter(isRelocation).map((operation) => operation.blockId)),
});
