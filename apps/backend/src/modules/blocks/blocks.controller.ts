import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { PageReadThrottlerGuard } from '../../common/infrastructure/guards/page-read-throttler.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { BlocksService } from './blocks.service';
import { BLOCK_SYNC_CHOICE_MESSAGE } from './constants/blocks.constants';
import { SyncBlocksDto } from './dto/block.sync.dto';
import type { BlockSyncRequest, BlockSyncResponse } from './types/blocks.types';

const toSyncRequest = (dto: SyncBlocksDto): BlockSyncRequest => {
  if (dto.pageId !== undefined && dto.blocks === undefined) return { kind: 'page', pageId: dto.pageId };
  if (dto.blocks !== undefined && dto.pageId === undefined) return { blocks: dto.blocks, kind: 'changed' };
  throw new BadRequestException(BLOCK_SYNC_CHOICE_MESSAGE);
};

@Controller('sync')
@UseGuards(JwtAuthGuard, PageReadThrottlerGuard)
export class BlocksController {
  constructor(
    private readonly blocksService: BlocksService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncBlocksDto, @User('payload') payload: TokenPayload): Promise<BlockSyncResponse> {
    const request = toSyncRequest(dto);
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.blocksService.sync(request, {
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }
}
