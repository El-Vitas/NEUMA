import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PagesService } from './pages.service';
import type { PageSummary } from './types/page.types';

/** What somebody was given to do, asked across every space rather than one at a time. */
@Controller('pages/assigned')
export class PageAssignedController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@User('payload') payload: TokenPayload): Promise<readonly PageSummary[]> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.pagesService.listAssignedTo(payload.sub, workspace.id, payload.role);
  }
}
