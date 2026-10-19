import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageTrashQueryDto } from './dto/page.trash.query.dto';
import { PagesService } from './pages.service';
import type { PagePurgeSchedule, TrashedPageSummary } from './types/page.types';

@Controller('pages/trash')
export class PageTrashController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query() dto: PageTrashQueryDto,
    @User('payload') payload: TokenPayload,
  ): Promise<readonly TrashedPageSummary[]> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.pagesService.listTrashed(
      workspace.id,
      payload.sub,
      payload.role,
      dto.spaceId ?? null,
      dto.search ?? null,
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async empty(@Query() dto: PageTrashQueryDto, @User('payload') payload: TokenPayload): Promise<PagePurgeSchedule> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.emptyTrash(workspace.id, payload.sub, payload.role, dto.spaceId ?? null);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }
}
