import { Controller, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { BlockLiveTokenService } from './block.live.token.service';

@Controller('blocks/live')
@UseGuards(JwtAuthGuard)
export class BlockLiveController {
  constructor(
    private readonly blockLiveTokenService: BlockLiveTokenService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post('token')
  async mintToken(@User('payload') payload: TokenPayload): Promise<{ token: string }> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const token = await this.blockLiveTokenService.mint({
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    return { token };
  }
}
