import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageMaintenanceService } from './page.maintenance.service';
import type { PageBlocksFillOutcome } from './types/page-maintenance.types';

@Controller('maintenance/pages')
@UseGuards(JwtAuthGuard)
export class PageMaintenanceController {
  constructor(
    private readonly pageMaintenanceService: PageMaintenanceService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post('blocks')
  @HttpCode(HttpStatus.OK)
  async fillBlocks(@User('payload') payload: TokenPayload): Promise<PageBlocksFillOutcome> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageMaintenanceService.fillPageBlocks({
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }
}
