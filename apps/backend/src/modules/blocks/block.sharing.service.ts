import { Injectable } from '@nestjs/common';
import { canManageBlockPermissions, canReadBlock, Result } from '@neuma/shared';
import type { DeclaringAncestor } from '../../common/domain/block-access.domain.types';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import type { BlockStanding } from '../../common/types/block-access.types';
import { BlockAccessDeniedError } from './domain/block.error';
import { listEntryUserIds, toAccessEntries, toAccessMembers } from './domain/block.sharing.domain';
import { BlockPermissionsForbiddenError } from './domain/block.transaction.error';
import { BlockSharingRepository } from './infrastructure/persistence/block.sharing.repository';
import type { BlockAccessResult, BlockAccessSource, BlockAccessView } from './types/block.sharing.types';
import type { BlockReader } from './types/blocks.types';

/**
 * Who has access to a block and why, told only to someone who holds full access on it. A block the viewer cannot
 * read is answered like one that does not exist, so a refusal never confirms a hidden block.
 */
@Injectable()
export class BlockSharingService {
  constructor(
    private readonly blockAccessRepository: BlockAccessRepository,
    private readonly sharingRepository: BlockSharingRepository,
  ) {}

  async describe(blockId: string, reader: BlockReader): Promise<BlockAccessResult> {
    const standing = await this.blockAccessRepository.findStanding(blockId, reader);
    if (standing === null || !canReadBlock(standing.role)) return Result.fail(new BlockAccessDeniedError());
    if (!canManageBlockPermissions(standing.role)) return Result.fail(new BlockPermissionsForbiddenError());
    return Result.ok(await this.compose(blockId, standing, reader));
  }

  private async compose(blockId: string, standing: BlockStanding, reader: BlockReader): Promise<BlockAccessView> {
    const permissions = standing.declaring?.permissions ?? null;
    const inheritedPermissions = standing.inheritedDeclaring?.permissions ?? null;
    const [users, members, spaceFacts, source, inheritedSource] = await Promise.all([
      this.sharingRepository.readUsers(
        [...new Set([...listEntryUserIds(permissions), ...listEntryUserIds(inheritedPermissions)])],
        reader.workspaceId,
      ),
      this.sharingRepository.listMembers(reader.workspaceId),
      this.sharingRepository.readSpaceFacts(standing.spaceId),
      this.readSource(standing.declaring),
      this.readSource(standing.inheritedDeclaring),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    return {
      blockId,
      entries: toAccessEntries(permissions, usersById),
      inherited: { entries: toAccessEntries(inheritedPermissions, usersById), source: inheritedSource },
      isDeclaredHere: standing.declaring?.id === blockId,
      members: spaceFacts === null ? [] : toAccessMembers(members, spaceFacts),
      source,
      spaceId: standing.spaceId,
      viewerId: reader.userId,
    };
  }

  private async readSource(declaring: DeclaringAncestor): Promise<BlockAccessSource | null> {
    return declaring === null ? null : this.sharingRepository.readSource(declaring.id);
  }
}
