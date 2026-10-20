import {
  type BlockAncestorPermissions,
  type BlockRole,
  type BlockViewer,
  blockPlainTextSchema,
  canReadBlock,
  extractPlainText,
  PAGE_LIFECYCLE,
  resolveBlockRole,
} from '@neuma/shared';
import type { BlockAccessChainRow, ReadableBlocksInput } from '../types/block-access.types';
import type {
  BlockDeclarationSource,
  DeclarationSourcesById,
  DeclaringAncestor,
  DeclaringAncestorsById,
  RoleSourcesById,
  RolesById,
} from './block-access.domain.types';

export const indexById = <Indexed extends { readonly id: string }>(
  records: readonly Indexed[],
): ReadonlyMap<string, Indexed> => new Map(records.map((record) => [record.id, record]));

const toDeclaring = (source: BlockDeclarationSource): DeclaringAncestor => ({
  id: source.id,
  permissions: source.permissions,
});

/**
 * The nearest block, from this one upwards, that declares permissions. It is memoized per id, so each block is
 * resolved once from its parent. A cycle meets the in-progress marker and counts as having no declaration.
 */
const findDeclaringAncestor = (
  source: BlockDeclarationSource,
  sourcesById: DeclarationSourcesById,
  memo: Map<string, DeclaringAncestor>,
): DeclaringAncestor => {
  const memoized = memo.get(source.id);
  if (memoized !== undefined) return memoized;
  memo.set(source.id, null);
  const resolved = source.permissions === null ? findInherited(source, sourcesById, memo) : toDeclaring(source);
  memo.set(source.id, resolved);
  return resolved;
};

const findInherited = (
  source: BlockDeclarationSource,
  sourcesById: DeclarationSourcesById,
  memo: Map<string, DeclaringAncestor>,
): DeclaringAncestor => {
  const parent = source.parentId === null ? undefined : sourcesById.get(source.parentId);
  return parent === undefined ? null : findDeclaringAncestor(parent, sourcesById, memo);
};

/** The declaring ancestor of every source, each resolved once whatever the depth of the tree. */
export const listDeclaringAncestors = (sourcesById: DeclarationSourcesById): DeclaringAncestorsById => {
  const memo = new Map<string, DeclaringAncestor>();
  return new Map(
    [...sourcesById.values()].map((source) => [source.id, findDeclaringAncestor(source, sourcesById, memo)]),
  );
};

/** The first block of a chain that runs from a block upwards and declares permissions, if any does. */
export const findDeclaringInChain = (chain: readonly BlockAncestorPermissions[]): DeclaringAncestor => {
  const declaring = chain.find((link) => link.permissions !== null);
  return declaring === undefined ? null : { id: declaring.id, permissions: declaring.permissions };
};

/** The role a viewer holds from the permissions of the nearest declaring ancestor; none declared means the ceiling. */
export const resolveRoleFromDeclaring = (
  declaring: DeclaringAncestor,
  canReadSpace: boolean,
  viewer: BlockViewer,
): BlockRole => resolveBlockRole({ canReadSpace, chain: declaring === null ? [] : [declaring], viewer });

/** The role of every record for one viewer. The writes reuse it, so reads and writes agree on who may do what. */
export const resolveRoles = (
  { readableSpaceIds, viewer }: { readonly readableSpaceIds: ReadonlySet<string>; readonly viewer: BlockViewer },
  recordsById: RoleSourcesById,
): RolesById => {
  const declaringById = listDeclaringAncestors(recordsById);
  return new Map(
    [...recordsById.values()].map((record) => [
      record.id,
      resolveRoleFromDeclaring(declaringById.get(record.id) ?? null, readableSpaceIds.has(record.spaceId), viewer),
    ]),
  );
};

const groupByCandidate = (
  rows: readonly BlockAccessChainRow[],
): ReadonlyMap<string, readonly BlockAccessChainRow[]> => {
  const chains = new Map<string, BlockAccessChainRow[]>();
  for (const row of rows) {
    const chain = chains.get(row.candidateId);
    if (chain === undefined) chains.set(row.candidateId, [row]);
    else chain.push(row);
  }
  return chains;
};

const isInTrashOrRemoved = (chain: readonly BlockAccessChainRow[]): boolean =>
  chain.some((row) => !row.alive || row.lifecycle === PAGE_LIFECYCLE.TRASHED);

/**
 * A block is readable when it and every ancestor is alive and out of the trash, and the nearest block that declares
 * permissions grants the viewer a reading role. Rows come ordered from the candidate upwards.
 */
export const listReadableBlockIds = ({ readableSpaceIds, rows, viewer }: ReadableBlocksInput): ReadonlySet<string> => {
  const readable = new Set<string>();
  for (const [candidateId, chain] of groupByCandidate(rows)) {
    const candidate = chain.at(0);
    if (candidate === undefined || isInTrashOrRemoved(chain)) continue;
    const role = resolveRoleFromDeclaring(findDeclaringInChain(chain), readableSpaceIds.has(candidate.spaceId), {
      userId: viewer.userId,
      workspaceRole: viewer.role,
    });
    if (canReadBlock(role)) readable.add(candidateId);
  }
  return readable;
};

/** A page title is plain text under `properties.title`; anything else reads as an empty title. */
export const readBlockTitle = (properties: unknown): string => {
  if (typeof properties !== 'object' || properties === null || !('title' in properties)) return '';
  const title = blockPlainTextSchema.safeParse(properties.title);
  return title.success ? extractPlainText(title.data) : '';
};
