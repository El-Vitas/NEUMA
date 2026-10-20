import { BLOCK_PRINCIPAL_KIND } from '@neuma/shared';
import { canReadSpace } from '../../../common/domain/workspace.domain';
import type {
  AccessUser,
  BlockAccessEntry,
  BlockAccessMember,
  BlockPermissionEntries,
  SpaceReadingFacts,
  WorkspaceMemberRow,
} from './block.sharing.domain.types';

/** The people a declaration names, so their names can be read in one query. */
export const listEntryUserIds = (permissions: BlockPermissionEntries): string[] =>
  (permissions ?? []).flatMap((entry) =>
    entry.principal.kind === BLOCK_PRINCIPAL_KIND.user ? [entry.principal.userId] : [],
  );

/** A block that declares nothing lists nobody: the space decides who may read it. */
export const toAccessEntries = (
  permissions: BlockPermissionEntries,
  usersById: ReadonlyMap<string, AccessUser>,
): BlockAccessEntry[] =>
  (permissions ?? []).map((entry) => ({
    principal: entry.principal,
    role: entry.role,
    user: entry.principal.kind === BLOCK_PRINCIPAL_KIND.user ? (usersById.get(entry.principal.userId) ?? null) : null,
  }));

/** Marks who cannot read the space, because a role on a block does not open a space. */
export const toAccessMembers = (
  members: readonly WorkspaceMemberRow[],
  space: SpaceReadingFacts,
): BlockAccessMember[] =>
  members.map((member) => ({
    ...member,
    canReadSpace: canReadSpace(
      member.workspaceRole,
      space.visibility,
      space.memberIds.has(member.id),
      space.ownerId === member.id,
    ),
  }));
