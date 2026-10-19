import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { BlockTransactionsService } from './block.transactions.service';
import { ApplyBlockTransactionsDto } from './dto/block.transactions.dto';
import { BlockWriteThrottlerGuard } from './infrastructure/guards/block-write-throttler.guard';
import type { BlockTransactionsResponse } from './types/block.transaction.types';

/** Throttled per user for live typing; the size of one request is bounded by the DTO. */
@Controller('transactions')
@UseGuards(JwtAuthGuard, BlockWriteThrottlerGuard)
export class BlockTransactionsController {
  constructor(
    private readonly blockTransactionsService: BlockTransactionsService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async apply(
    @Body() dto: ApplyBlockTransactionsDto,
    @User('payload') payload: TokenPayload,
  ): Promise<BlockTransactionsResponse> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.blockTransactionsService.apply(dto.transactions, {
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
  }
}
