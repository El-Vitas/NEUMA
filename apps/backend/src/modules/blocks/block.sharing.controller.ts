import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { BlockSharingService } from './block.sharing.service';
import type { BlockAccessView } from './types/block.sharing.types';

/** Reads only; the declaration itself is written with the `setPermission` transaction command. */
@Controller('blocks/:blockId/access')
@UseGuards(JwtAuthGuard)
export class BlockSharingController {
  constructor(
    private readonly blockSharingService: BlockSharingService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  async describe(@Param('blockId') blockId: string, @User('payload') payload: TokenPayload): Promise<BlockAccessView> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.blockSharingService.describe(blockId, {
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }
}
