import {
  type BlockRole,
  canManageBlockPermissions,
  canReadBlock,
  filterVisibleBlockIds,
  resolveBlockRole,
} from '@neuma/shared';
import type {
  BlockRecord,
  DeclaringAncestor,
  RecordsById,
  RolesById,
  VisibleBlock,
  VisibleBlocksInput,
} from './block.domain.types';

export const indexById = (records: readonly BlockRecord[]): RecordsById =>
  new Map(records.map((record) => [record.id, record]));

/**
 * The nearest block, from this one upwards, that declares permissions. It is memoized per id, so each block is
 * resolved once from its parent. A cycle meets the in-progress marker and counts as having no declaration.
 */
const findDeclaringAncestor = (
  record: BlockRecord,
  recordsById: RecordsById,
  memo: Map<string, DeclaringAncestor>,
): DeclaringAncestor => {
  const memoized = memo.get(record.id);
  if (memoized !== undefined) return memoized;
  memo.set(record.id, null);
  const resolved = record.permissions === null ? findInherited(record, recordsById, memo) : toDeclaring(record);
  memo.set(record.id, resolved);
  return resolved;
};

const findInherited = (
  record: BlockRecord,
  recordsById: RecordsById,
  memo: Map<string, DeclaringAncestor>,
): DeclaringAncestor => {
  const parent = record.parentId === null ? undefined : recordsById.get(record.parentId);
  return parent === undefined ? null : findDeclaringAncestor(parent, recordsById, memo);
};

const toDeclaring = (record: BlockRecord): DeclaringAncestor => ({ id: record.id, permissions: record.permissions });

/** The role of every record for one viewer. The writes reuse it, so reads and writes agree on who may do what. */
export const resolveRoles = (
  { readableSpaceIds, viewer }: Pick<VisibleBlocksInput, 'readableSpaceIds' | 'viewer'>,
  recordsById: RecordsById,
): RolesById => {
  const memo = new Map<string, DeclaringAncestor>();
  return new Map(
    [...recordsById.values()].map((record) => {
      const declaring = findDeclaringAncestor(record, recordsById, memo);
      const role = resolveBlockRole({
        canReadSpace: readableSpaceIds.has(record.spaceId),
        chain: declaring === null ? [] : [declaring],
        viewer,
      });
      return [record.id, role];
    }),
  );
};

/** A block is cut off with its whole branch once an ancestor among the targets is unreadable. */
const isReachable = (
  record: BlockRecord,
  targetsById: RecordsById,
  rolesById: RolesById,
  memo: Map<string, boolean>,
): boolean => {
  const memoized = memo.get(record.id);
  if (memoized !== undefined) return memoized;
  memo.set(record.id, true);
  const role = rolesById.get(record.id);
  const parent = record.parentId === null ? undefined : targetsById.get(record.parentId);
  const isReadable = role !== undefined && canReadBlock(role);
  const reachable = isReadable && (parent === undefined || isReachable(parent, targetsById, rolesById, memo));
  memo.set(record.id, reachable);
  return reachable;
};

const listVisibleChildren = (children: readonly string[], rolesById: RolesById): string[] =>
  filterVisibleBlockIds(
    children.flatMap((id) => {
      const role = rolesById.get(id);
      return role === undefined ? [] : [{ id, role }];
    }),
  );

const toVisibleBlock = (
  { permissions, ...record }: BlockRecord,
  role: BlockRole,
  rolesById: RolesById,
): VisibleBlock => ({
  ...record,
  children: listVisibleChildren(record.children, rolesById),
  role,
  ...(canManageBlockPermissions(role) ? { permissions } : {}),
});

/**
 * The blocks the viewer may receive, each with its role. Roles come from the nearest declaring ancestor, so a block
 * whose parent is not among the targets still resolves from the context rows. Children the viewer cannot read, or
 * that are not known at all, are dropped so their ids are never revealed.
 */
export const buildVisibleBlocks = (input: VisibleBlocksInput): VisibleBlock[] => {
  const recordsById = indexById([...input.rows.targets, ...input.rows.context]);
  const rolesById = resolveRoles(input, recordsById);
  const targetsById = indexById(input.rows.targets);
  const reachability = new Map<string, boolean>();
  return input.rows.targets.flatMap((record) => {
    const role = rolesById.get(record.id);
    return role !== undefined && isReachable(record, targetsById, rolesById, reachability)
      ? [toVisibleBlock(record, role, rolesById)]
      : [];
  });
};

/**
 * Requested ids the client must drop: they no longer exist or the viewer can no longer read them. A requested
 * block that is only unchanged and still readable is not revoked. The client already holds every id listed.
 */
export const listRevokedBlockIds = (
  input: VisibleBlocksInput,
  requestedIds: readonly string[],
  visibleBlocks: readonly VisibleBlock[],
): string[] => {
  const recordsById = indexById([...input.rows.targets, ...input.rows.context]);
  const rolesById = resolveRoles(input, recordsById);
  const visibleIds = new Set(visibleBlocks.map((block) => block.id));
  const targetIds = new Set(input.rows.targets.map((record) => record.id));
  const isKeptAsUnchanged = (id: string): boolean => {
    const role = rolesById.get(id);
    return role !== undefined && canReadBlock(role) && !targetIds.has(id);
  };
  return [...new Set(requestedIds)].filter((id) => !visibleIds.has(id) && !isKeptAsUnchanged(id));
};
