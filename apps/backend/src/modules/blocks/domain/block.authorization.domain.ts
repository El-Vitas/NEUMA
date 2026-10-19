import {
  BLOCK_ROLE,
  canEditBlock,
  canManageBlockPermissions,
  canReadBlock,
  Result,
  resolveBlockRole,
} from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord } from './block.domain.types';
import { BlockAccessDeniedError } from './block.error';
import type {
  AuthorizationInput,
  AuthorizationPower,
  BlockOperation,
  WorkingBlock,
} from './block.transaction.domain.types';
import {
  BlockAlreadyExistsError,
  BlockEditForbiddenError,
  BlockLockedError,
  BlockPermissionsForbiddenError,
  BlockTrashedError,
} from './block.transaction.error';
import { findWriteBlocker } from './block.tree.domain';

const ok = (): Result<void, DomainError> => Result.ok(undefined);

const checkWritable = (blockId: string, input: AuthorizationInput): Result<void, DomainError> => {
  const blocker = findWriteBlocker(blockId, input.recordsById, input.maxDepth);
  if (blocker === 'trashed') return Result.fail(new BlockTrashedError());
  return blocker === 'locked' ? Result.fail(new BlockLockedError()) : ok();
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
): Result<void, DomainError> => {
  const role = block === undefined ? BLOCK_ROLE.none : (input.rolesById.get(block.id) ?? BLOCK_ROLE.none);
  if (block === undefined || block.spaceId !== input.spaceId || !canReadBlock(role)) {
    return Result.fail(new BlockAccessDeniedError());
  }
  if (!hasPower(power, block, input)) {
    return Result.fail(power === 'manage' ? new BlockPermissionsForbiddenError() : new BlockEditForbiddenError());
  }
  return checkWritable(block.id, input);
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

const authorizeOperation = (
  operation: BlockOperation,
  createdIds: ReadonlySet<string>,
  input: AuthorizationInput,
): Result<void, DomainError> => {
  const isCreatedHere = createdIds.has(operation.blockId);
  if (operation.command === 'create') return authorizeCreation(operation.blockId, isCreatedHere, input);
  if (isCreatedHere) return ok();
  const power: AuthorizationPower = operation.command === 'setPermissions' ? 'manage' : 'edit';
  return authorizeExisting(input.before.get(operation.blockId), power, input);
};

/**
 * Before anything is applied: every block an operation points at must exist, be readable and editable by the
 * viewer (full for permissions), and not be locked or trashed. A block created earlier in the same transaction is
 * checked later, through its parent.
 */
export const authorizeTargets = (
  operations: readonly BlockOperation[],
  input: AuthorizationInput,
): Result<void, DomainError> => {
  const createdIds = new Set<string>();
  for (const operation of operations) {
    const checked = authorizeOperation(operation, createdIds, input);
    if (checked.isFail()) return checked;
    if (operation.command === 'create') createdIds.add(operation.blockId);
  }
  return ok();
};

const authorizeParent = (parentId: string | null, input: AuthorizationInput): Result<void, DomainError> => {
  if (parentId !== null) return authorizeExisting(input.recordsById.get(parentId), 'edit', input);
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
