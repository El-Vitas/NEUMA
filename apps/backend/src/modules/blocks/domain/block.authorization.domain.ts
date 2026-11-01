import {
  BLOCK_ROLE,
  BLOCK_TYPE,
  canEditBlock,
  canManageBlockPermissions,
  canReadBlock,
  PAGE_LIFECYCLE,
  Result,
  resolveBlockRole,
} from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord } from './block.domain.types';
import { BlockAccessDeniedError } from './block.error';
import { BLOCK_NO_TOLERATED_BLOCKERS } from './block.operation.constants';
import { isPageOperation } from './block.page-operation.domain';
import type {
  AuthorizationInput,
  AuthorizationPower,
  BlockOperation,
  BlockPageOperation,
  WorkingBlock,
  WriteBlocker,
} from './block.transaction.domain.types';
import {
  BlockAlreadyExistsError,
  BlockEditForbiddenError,
  BlockLockedError,
  BlockNotTrashedError,
  BlockOperationInvalidError,
  BlockPermissionsForbiddenError,
  BlockTrashedError,
} from './block.transaction.error';
import { findWriteBlocker } from './block.tree.domain';

const ok = (): Result<void, DomainError> => Result.ok(undefined);

/** A blocker the command tolerates is not a refusal: unlocking a page has to work on a locked page. */
const checkWritable = (
  blockId: string,
  input: AuthorizationInput,
  tolerated: readonly WriteBlocker[],
): Result<void, DomainError> => {
  const blocker = findWriteBlocker(blockId, input.recordsById, input.maxDepth);
  if (blocker === null || tolerated.includes(blocker)) return ok();
  return Result.fail(blocker === 'trashed' ? new BlockTrashedError() : new BlockLockedError());
};

const hasPower = (power: AuthorizationPower, block: BlockRecord, input: AuthorizationInput): boolean => {
  const role = input.rolesById.get(block.id) ?? BLOCK_ROLE.none;
  return power === 'manage' ? canManageBlockPermissions(role) : canEditBlock(role);
};

/** A block the viewer cannot read answers like a missing one; one they can read but not change says so. */
const authorizeExisting = (
  block: BlockRecord | undefined,
  power: AuthorizationPower,
  input: AuthorizationInput,
  tolerated: readonly WriteBlocker[],
  spaceId: string = input.spaceId,
): Result<void, DomainError> => {
  const role = block === undefined ? BLOCK_ROLE.none : (input.rolesById.get(block.id) ?? BLOCK_ROLE.none);
  if (block?.spaceId !== spaceId || !canReadBlock(role)) {
    return Result.fail(new BlockAccessDeniedError());
  }
  if (!hasPower(power, block, input)) {
    return Result.fail(power === 'manage' ? new BlockPermissionsForbiddenError() : new BlockEditForbiddenError());
  }
  return checkWritable(block.id, input, tolerated);
};

/**
 * Which refusals a page command does not make. Locking, verifying, giving an owner, trashing, restoring and moving
 * a page are not edits of what it says, so a lock does not stop them; only the property values are.
 */
const listToleratedBlockers = (operation: BlockPageOperation): readonly WriteBlocker[] => {
  switch (operation.command) {
    case 'mergePageValues':
    case 'changeValueList':
      return BLOCK_NO_TOLERATED_BLOCKERS;
    case 'rewritePageValues':
      return ['locked', 'trashed'];
    case 'setLifecycle':
      return operation.lifecycle === PAGE_LIFECYCLE.ACTIVE ? ['locked', 'trashed'] : ['locked'];
    default:
      return ['locked'];
  }
};

/** A page can be trashed once and restored only from the trash. */
const checkLifecycleStep = (block: BlockRecord, operation: BlockPageOperation): Result<void, DomainError> => {
  if (operation.command !== 'setLifecycle') return ok();
  const isTrashed = block.lifecycle === PAGE_LIFECYCLE.TRASHED;
  if (operation.lifecycle === PAGE_LIFECYCLE.TRASHED) return isTrashed ? Result.fail(new BlockTrashedError()) : ok();
  return isTrashed ? ok() : Result.fail(new BlockNotTrashedError());
};

const authorizePageCommand = (operation: BlockPageOperation, input: AuthorizationInput): Result<void, DomainError> => {
  const block = input.before.get(operation.blockId);
  const authorized = authorizeExisting(block, 'edit', input, listToleratedBlockers(operation));
  if (authorized.isFail() || block === undefined) return authorized;
  if (block.type !== BLOCK_TYPE.page)
    return Result.fail(new BlockOperationInvalidError('The command applies to a page'));
  const placed = authorizeNewParent(operation, input);
  return placed.isFail() ? placed : checkLifecycleStep(block, operation);
};

/** The page of another space that takes the moved page must be one its mover can edit, and that is not locked. */
const authorizeNewParent = (operation: BlockPageOperation, input: AuthorizationInput): Result<void, DomainError> => {
  if (operation.command !== 'moveToSpaceRoot' || operation.parentId === null) return ok();
  const parent = input.recordsById.get(operation.parentId);
  return authorizeExisting(parent, 'edit', input, BLOCK_NO_TOLERATED_BLOCKERS, operation.spaceId);
};

const authorizeCreation = (
  blockId: string,
  isCreatedAlready: boolean,
  input: AuthorizationInput,
): Result<void, DomainError> => {
  const existing = input.before.get(blockId);
  if (existing === undefined && !isCreatedAlready) return ok();
  const role = existing === undefined ? BLOCK_ROLE.reader : (input.rolesById.get(existing.id) ?? BLOCK_ROLE.none);
  return Result.fail(canReadBlock(role) ? new BlockAlreadyExistsError() : new BlockAccessDeniedError());
};

/**
 * A block made in this transaction takes its edit power from its parent, checked later. Declaring who may open it is
 * managing permissions, so it asks the parent for that power, as it would of a block that already exists.
 */
const authorizeCreatedBlock = (
  operation: BlockOperation,
  parentId: string | null,
  createdParents: ReadonlyMap<string, string | null>,
  input: AuthorizationInput,
): Result<void, DomainError> => {
  if (operation.command !== 'setPermissions' || (parentId !== null && createdParents.has(parentId))) return ok();
  if (parentId !== null) {
    return authorizeExisting(input.recordsById.get(parentId), 'manage', input, BLOCK_NO_TOLERATED_BLOCKERS);
  }
  const rootRole = resolveBlockRole({ canReadSpace: input.isSpaceReadable, chain: [], viewer: input.viewer });
  return canManageBlockPermissions(rootRole) ? ok() : Result.fail(new BlockPermissionsForbiddenError());
};

const authorizeOperation = (
  operation: BlockOperation,
  createdParents: ReadonlyMap<string, string | null>,
  input: AuthorizationInput,
): Result<void, DomainError> => {
  const isCreatedHere = createdParents.has(operation.blockId);
  if (operation.command === 'create') return authorizeCreation(operation.blockId, isCreatedHere, input);
  if (isCreatedHere) {
    return authorizeCreatedBlock(operation, createdParents.get(operation.blockId) ?? null, createdParents, input);
  }
  if (isPageOperation(operation)) return authorizePageCommand(operation, input);
  const power: AuthorizationPower = operation.command === 'setPermissions' ? 'manage' : 'edit';
  return authorizeExisting(input.before.get(operation.blockId), power, input, BLOCK_NO_TOLERATED_BLOCKERS);
};

/** A view changes with its collection: the viewer needs edit on it, and it may not be locked or trashed. */
export const authorizeCollectionEdit = (collectionId: string, input: AuthorizationInput): Result<void, DomainError> =>
  authorizeExisting(input.recordsById.get(collectionId), 'edit', input, BLOCK_NO_TOLERATED_BLOCKERS);

/**
 * Before anything is applied: every block an operation points at must exist, be readable and editable by the
 * viewer (full for permissions), and not be locked or trashed. A block created earlier in the same transaction is
 * checked later, through its parent.
 */
export const authorizeTargets = (
  operations: readonly BlockOperation[],
  input: AuthorizationInput,
): Result<void, DomainError> => {
  const createdParents = new Map<string, string | null>();
  for (const operation of operations) {
    const checked = authorizeOperation(operation, createdParents, input);
    if (checked.isFail()) return checked;
    if (operation.command === 'create') createdParents.set(operation.blockId, operation.fields.parentId);
  }
  return ok();
};

const authorizeParent = (parentId: string | null, input: AuthorizationInput): Result<void, DomainError> => {
  if (parentId !== null) {
    return authorizeExisting(input.recordsById.get(parentId), 'edit', input, BLOCK_NO_TOLERATED_BLOCKERS);
  }
  const rootRole = resolveBlockRole({ canReadSpace: input.isSpaceReadable, chain: [], viewer: input.viewer });
  return canEditBlock(rootRole) ? ok() : Result.fail(new BlockEditForbiddenError());
};

const placementsOf = (block: WorkingBlock, input: AuthorizationInput): (string | null)[] => {
  const previous = input.before.get(block.id);
  if (previous === undefined) return [block.parentId];
  return previous.parentId === block.parentId ? [] : [block.parentId, previous.parentId];
};

/**
 * After the operations: a block that was created or moved needs edit on its new parent, and a moved one also on its
 * old parent. Neither parent may be locked or trashed. The roles here include the blocks this transaction created.
 */
export const authorizePlacements = (
  after: ReadonlyMap<string, WorkingBlock>,
  touchedIds: readonly string[],
  input: AuthorizationInput,
): Result<void, DomainError> => {
  for (const id of touchedIds) {
    const block = after.get(id);
    if (block === undefined) continue;
    for (const parentId of placementsOf(block, input)) {
      const checked = authorizeParent(parentId, input);
      if (checked.isFail()) return checked;
    }
  }
  return ok();
};
