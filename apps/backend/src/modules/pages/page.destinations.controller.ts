import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PagesService } from './pages.service';
import type { PageMoveDestinations } from './types/page.types';

/**
 * Where a page could go, asked across every space this reader reaches rather
 * than within the one the page happens to be in: moving somewhere else is the
 * whole point of asking.
 */
@Controller('pages/move-destinations')
export class PageDestinationsController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get(':pageId')
  @UseGuards(JwtAuthGuard)
  async list(@Param('pageId') pageId: string, @User('payload') payload: TokenPayload): Promise<PageMoveDestinations> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pagesService.listMoveDestinations(pageId, workspace.id, payload.sub, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }
}
