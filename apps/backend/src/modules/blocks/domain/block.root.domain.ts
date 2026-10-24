import { BLOCK_TYPE, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import { BlockAccessDeniedError } from './block.error';
import { placeChild } from './block.operation.domain';
import type { BlockOperation, RootLists, SpaceRoots, WorkingBlock } from './block.transaction.domain.types';
import { BlockTreeInvalidError } from './block.transaction.error';

const isRootPage = (block: WorkingBlock | undefined): block is WorkingBlock =>
  block?.type === BLOCK_TYPE.page && block.parentId === null && block.alive;

const findList = (lists: RootLists, spaceId: string): Result<string[], DomainError> => {
  const list = lists.get(spaceId);
  return list === undefined ? Result.fail(new BlockAccessDeniedError()) : Result.ok(list);
};

const applyExplicitOperation = (
  operation: BlockOperation,
  after: ReadonlyMap<string, WorkingBlock>,
  lists: RootLists,
): Result<void, DomainError> => {
  if (operation.command !== 'insertRoot' && operation.command !== 'removeRoot') return Result.ok(undefined);
  const list = findList(lists, operation.spaceId);
  if (list.isFail()) return Result.fail(list.getError());
  if (operation.command === 'removeRoot') {
    lists.set(
      operation.spaceId,
      list.getValue().filter((id) => id !== operation.blockId),
    );
    return Result.ok(undefined);
  }
  const page = after.get(operation.blockId);
  if (!isRootPage(page) || page.spaceId !== operation.spaceId) {
    return Result.fail(
      new BlockTreeInvalidError('Only a page at the top of the space can be listed there', operation.blockId),
    );
  }
  lists.set(operation.spaceId, placeChild(list.getValue(), operation.blockId, operation.placement));
  return Result.ok(undefined);
};

/** A page that left the top of its space, or the space, is no longer listed by it. */
const unlistPage = (previous: WorkingBlock, lists: RootLists): void => {
  const list = lists.get(previous.spaceId);
  if (list !== undefined)
    lists.set(
      previous.spaceId,
      list.filter((id) => id !== previous.id),
    );
};

/** A page that reached the top of a space, and was not placed by an operation, goes last. */
const listPage = (next: WorkingBlock, lists: RootLists): Result<void, DomainError> => {
  const list = findList(lists, next.spaceId);
  if (list.isFail()) return Result.fail(list.getError());
  if (!list.getValue().includes(next.id)) lists.set(next.spaceId, [...list.getValue(), next.id]);
  return Result.ok(undefined);
};

const reconcilePage = (
  previous: WorkingBlock | undefined,
  next: WorkingBlock,
  lists: RootLists,
): Result<void, DomainError> => {
  const isRoot = isRootPage(next);
  const isElsewhere = previous?.spaceId !== next.spaceId;
  if (isRootPage(previous) && (!isRoot || isElsewhere)) unlistPage(previous, lists);
  return isRoot && (!isRootPage(previous) || isElsewhere) ? listPage(next, lists) : Result.ok(undefined);
};

const toChangedLists = (spaces: readonly SpaceRoots[], lists: RootLists): SpaceRoots[] =>
  spaces.flatMap((space) => {
    const rootPageIds = lists.get(space.id) ?? space.rootPageIds;
    const isSame =
      rootPageIds.length === space.rootPageIds.length && rootPageIds.every((id, at) => id === space.rootPageIds[at]);
    return isSame ? [] : [{ id: space.id, rootPageIds }];
  });

/**
 * The lists of top-level pages after the transaction: the placements it asked for, and then every page that reached
 * the top of a space or left it, so a list never holds a page that is not at the top and never misses one that is.
 */
export const applyRootLists = (
  spaces: readonly SpaceRoots[],
  operations: readonly BlockOperation[],
  before: ReadonlyMap<string, WorkingBlock>,
  after: ReadonlyMap<string, WorkingBlock>,
  touchedIds: readonly string[],
): Result<SpaceRoots[], DomainError> => {
  const lists: RootLists = new Map(spaces.map((space) => [space.id, [...space.rootPageIds]]));
  for (const operation of operations) {
    const applied = applyExplicitOperation(operation, after, lists);
    if (applied.isFail()) return Result.fail(applied.getError());
  }
  for (const id of touchedIds) {
    const next = after.get(id);
    if (next?.type !== BLOCK_TYPE.page) continue;
    const reconciled = reconcilePage(before.get(id), next, lists);
    if (reconciled.isFail()) return Result.fail(reconciled.getError());
  }
  return Result.ok(toChangedLists(spaces, lists));
};
