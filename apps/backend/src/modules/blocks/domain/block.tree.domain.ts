import { BLOCK_TYPE, PAGE_LIFECYCLE, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord, RecordsById } from './block.domain.types';
import { BlockTreeTooDeepError } from './block.error';
import type { TreeCheckInput, WorkingBlock, WriteBlocker } from './block.transaction.domain.types';
import { BlockCycleError, BlockTreeInvalidError } from './block.transaction.error';

/** From the block up to its top ancestor. It stops one past the limit, so the caller can tell a chain too deep. */
export const walkChain = <Link extends Pick<BlockRecord, 'id' | 'parentId'>>(
  startId: string,
  recordsById: ReadonlyMap<string, Link>,
  maxDepth: number,
): Link[] => {
  const chain: Link[] = [];
  const seen = new Set<string>();
  let current = recordsById.get(startId);
  while (current !== undefined && !seen.has(current.id) && chain.length <= maxDepth) {
    chain.push(current);
    seen.add(current.id);
    current = current.parentId === null ? undefined : recordsById.get(current.parentId);
  }
  return chain;
};

const isLocked = (record: BlockRecord | undefined): boolean => record?.lockedAt instanceof Date;

/**
 * Why a block cannot be written, if it cannot. A trashed block or ancestor refuses everything. A lock on the block,
 * or on its nearest page (itself when it is one), refuses everything below it.
 */
export const findWriteBlocker = (blockId: string, recordsById: RecordsById, maxDepth: number): WriteBlocker | null => {
  const chain = walkChain(blockId, recordsById, maxDepth);
  if (chain.some((record) => record.lifecycle === PAGE_LIFECYCLE.TRASHED)) return 'trashed';
  const nearestPage = chain.find((record) => record.type === BLOCK_TYPE.page);
  return isLocked(chain[0]) || isLocked(nearestPage) ? 'locked' : null;
};

/** The page whose backlinks list this block: the block itself when it is a page. */
export const findSourcePageId = (
  blockId: string,
  recordsById: ReadonlyMap<string, Pick<BlockRecord, 'id' | 'parentId' | 'type'>>,
  maxDepth: number,
): string | null =>
  walkChain(blockId, recordsById, maxDepth).find((record) => record.type === BLOCK_TYPE.page)?.id ?? null;

const ok = (): Result<void, DomainError> => Result.ok(undefined);

const invalid = (message: string, blockId: string): Result<void, DomainError> =>
  Result.fail(new BlockTreeInvalidError(message, blockId));

/** A move must not hang a block under itself or under one of its descendants. */
const checkNoCycle = (block: WorkingBlock, { maxDepth, recordsById }: TreeCheckInput): Result<void, DomainError> => {
  if (block.parentId === null) return ok();
  const chain = walkChain(block.parentId, recordsById, maxDepth);
  if (chain.length > maxDepth) return Result.fail(new BlockTreeTooDeepError(maxDepth));
  return chain.some((record) => record.id === block.id) ? Result.fail(new BlockCycleError(block.id)) : ok();
};

const checkPlacedUnderParent = (block: WorkingBlock, input: TreeCheckInput): Result<void, DomainError> => {
  if (block.parentId === null) {
    return block.type === BLOCK_TYPE.page ? ok() : invalid('Only a page can sit at the root', block.id);
  }
  const parent = input.recordsById.get(block.parentId);
  if (parent === undefined) return invalid('The parent block does not exist', block.id);
  if (parent.spaceId !== block.spaceId) return invalid('The parent block belongs to another space', block.id);
  const isListed = parent.children.includes(block.id);
  return block.alive === isListed
    ? ok()
    : invalid('A live block is listed in its parent children and a removed one is not', block.id);
};

const checkLeftPreviousParent = (block: WorkingBlock, input: TreeCheckInput): Result<void, DomainError> => {
  const previousParentId = input.before.get(block.id)?.parentId ?? null;
  if (previousParentId === null || previousParentId === block.parentId) return ok();
  const isStillListed = input.recordsById.get(previousParentId)?.children.includes(block.id) === true;
  return isStillListed ? invalid('A moved block must leave the children of its previous parent', block.id) : ok();
};

const hasChangedPlace = (block: WorkingBlock, input: TreeCheckInput): boolean => {
  const previous = input.before.get(block.id);
  return previous?.parentId !== block.parentId || previous.alive !== block.alive;
};

/** A page sits in the tree and a content block in the document of a page: becoming the other would strand its place. */
const checkPageBoundary = (block: WorkingBlock, input: TreeCheckInput): Result<void, DomainError> => {
  const previous = input.before.get(block.id);
  const crossed = previous !== undefined && (previous.type === BLOCK_TYPE.page) !== (block.type === BLOCK_TYPE.page);
  return crossed ? invalid('A block cannot become a page or stop being one', block.id) : ok();
};

const checkPlace = (block: WorkingBlock, input: TreeCheckInput): Result<void, DomainError> => {
  const boundary = checkPageBoundary(block, input);
  if (boundary.isFail()) return boundary;
  if (!hasChangedPlace(block, input)) return ok();
  for (const check of [checkPlacedUnderParent, checkNoCycle, checkLeftPreviousParent]) {
    const checked = check(block, input);
    if (checked.isFail()) return checked;
  }
  return ok();
};

const listChangedChildIds = (block: WorkingBlock, input: TreeCheckInput): string[] => {
  const previous = input.before.get(block.id)?.children ?? [];
  const added = block.children.filter((id) => !previous.includes(id));
  const removed = previous.filter((id) => !block.children.includes(id));
  return [...added, ...removed];
};

const checkChangedChild = (parent: WorkingBlock, childId: string, input: TreeCheckInput): Result<void, DomainError> => {
  const child = input.after.get(childId);
  if (!parent.children.includes(childId)) {
    const isStillUnderParent = child?.alive === true && child.parentId === parent.id;
    return isStillUnderParent ? invalid('A child removed from the list must be removed or moved too', parent.id) : ok();
  }
  if (child === undefined) return invalid('A listed child must be created or moved in the same transaction', parent.id);
  const isPlaced = child.alive && child.parentId === parent.id && child.spaceId === parent.spaceId;
  return isPlaced ? ok() : invalid('A listed child must be a live block whose parent is this block', parent.id);
};

const checkChildren = (block: WorkingBlock, input: TreeCheckInput): Result<void, DomainError> => {
  if (new Set(block.children).size !== block.children.length) return invalid('A block is listed twice', block.id);
  for (const childId of listChangedChildIds(block, input)) {
    const checked = checkChangedChild(block, childId, input);
    if (checked.isFail()) return checked;
  }
  return ok();
};

/**
 * The tree stays consistent after the operations. A block that was created, moved or removed sits under an existing
 * parent of its space that lists it exactly when it is alive, and makes no cycle. A block whose children changed
 * lists only live blocks whose parent it is, and lists no block that was moved away.
 */
export const checkTreeInvariants = (input: TreeCheckInput): Result<void, DomainError> => {
  for (const id of input.touchedIds) {
    const block = input.after.get(id);
    if (block === undefined) continue;
    const placed = checkPlace(block, input);
    if (placed.isFail()) return placed;
    const childrenChecked = checkChildren(block, input);
    if (childrenChecked.isFail()) return childrenChecked;
  }
  return ok();
};
