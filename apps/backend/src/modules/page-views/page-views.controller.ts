import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { UpdatePageViewsSettingsDto } from './dto/page-views.settings.update.dto';
import { PageViewsService } from './page-views.service';

@Controller('page-views')
export class PageViewsController {
  constructor(
    private readonly pageViewsService: PageViewsService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageViewsService.getSettings(workspace.id, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Body() dto: UpdatePageViewsSettingsDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageViewsService.updateSettings(workspace.id, payload.role, dto.enabled);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Get('pages/:pageId')
  @UseGuards(JwtAuthGuard)
  async getUsageSummary(@Param('pageId') pageId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageViewsService.getUsageSummary(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('pages/:pageId')
  @UseGuards(JwtAuthGuard)
  async recordView(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly acknowledged: true }> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    await this.pageViewsService.recordView(pageId, workspace.id, payload.sub, payload.role);
    return { acknowledged: true };
  }
}
