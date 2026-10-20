import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageAccessDeniedError } from './domain/page.error';
import { ListPageVersionsDto } from './dto/page.version.list.dto';
import { PageVersionRestoreThrottlerGuard } from './infrastructure/guards/page.version-restore-throttler.guard';
import { PagesService } from './pages.service';
import type { PageSummary, PageVersionListing, PageVersionSnapshot } from './types/page.types';

/** The history of a page: what it said at the end of each stretch of editing. */
@Controller('spaces/:spaceId/pages/:pageId/versions')
@UseGuards(JwtAuthGuard)
export class PageVersionsController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  async list(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Query() dto: ListPageVersionsDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageVersionListing> {
    const workspaceId = await this.requirePageInSpace(spaceId, pageId, payload);
    const result = await this.pagesService.listVersions(
      pageId,
      workspaceId,
      payload.sub,
      payload.role,
      dto.cursor ?? null,
      dto.limit,
    );
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Get(':version')
  async read(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Param('version', ParseIntPipe) version: number,
    @User('payload') payload: TokenPayload,
  ): Promise<PageVersionSnapshot> {
    const workspaceId = await this.requirePageInSpace(spaceId, pageId, payload);
    const result = await this.pagesService.readVersion(pageId, version, workspaceId, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post(':version/restore')
  @UseGuards(PageVersionRestoreThrottlerGuard)
  async restore(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Param('version', ParseIntPipe) version: number,
    @User('payload') payload: TokenPayload,
  ): Promise<PageSummary> {
    const workspaceId = await this.requirePageInSpace(spaceId, pageId, payload);
    const result = await this.pagesService.restoreVersion(pageId, version, payload.sub, workspaceId, payload.role);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  /** The route names a space; a page of another space is as out of reach as one that does not exist. */
  private async requirePageInSpace(spaceId: string, pageId: string, payload: TokenPayload): Promise<string> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.getAccessible(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) throw result.getError();
    if (result.getValue().spaceId !== spaceId) throw new PageAccessDeniedError();
    return workspace.id;
  }
}
