import { type BlockPermissionEntry, isBlockManageable, Result } from '@neuma/shared';
import type { DomainError } from '../../../common/domain/domain.error';
import type { BlockRecord } from './block.domain.types';
import type { PermissionsLockoutInput, WorkingBlock } from './block.transaction.domain.types';
import { BlockPermissionsLockoutError } from './block.transaction.error';

/** What decides access for a block once the transaction is applied: its own declaration, else the nearest above. */
const readDecidingPermissions = (
  block: WorkingBlock,
  recordsById: ReadonlyMap<string, BlockRecord>,
  maxDepth: number,
): readonly BlockPermissionEntry[] | null => {
  let current: BlockRecord | undefined = block;
  for (let depth = 0; current !== undefined && depth <= maxDepth; depth += 1) {
    if (current.permissions !== null) return current.permissions;
    current = current.parentId === null ? undefined : recordsById.get(current.parentId);
  }
  return null;
};

/**
 * A declaration that leaves nobody holding full access cannot be undone by anyone, so it is refused. It judges the
 * same roles the server resolves for reading, over the people who can open the space.
 */
export const checkPermissionsKeepAManager = ({
  after,
  maxDepth,
  members,
  operations,
  recordsById,
}: PermissionsLockoutInput): Result<void, DomainError> => {
  if (members === undefined) return Result.ok(undefined);
  for (const operation of operations) {
    if (operation.command !== 'setPermissions') continue;
    const block = after.get(operation.blockId);
    if (block === undefined) continue;
    if (!isBlockManageable(members, readDecidingPermissions(block, recordsById, maxDepth))) {
      return Result.fail(new BlockPermissionsLockoutError());
    }
  }
  return Result.ok(undefined);
};
