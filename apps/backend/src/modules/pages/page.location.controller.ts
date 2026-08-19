import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PagesService } from './pages.service';

/**
 * Which space a page lives in, asked without naming one.
 *
 * A page that moves between spaces changes address, and everything written
 * before the move still points at the old one. Asked this way, an address that
 * has gone stale can be answered with the page instead of with nothing.
 */
@Controller('pages/location')
export class PageLocationController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get(':pageId')
  @UseGuards(JwtAuthGuard)
  async find(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly spaceId: string }> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.getAccessible(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return { spaceId: result.getValue().spaceId };
  }
}
