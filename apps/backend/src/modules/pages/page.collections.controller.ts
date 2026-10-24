import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { PageReadThrottlerGuard } from '../../common/infrastructure/guards/page-read-throttler.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageSchemaService } from './page-schema.service';

@Controller('spaces/:spaceId/collections')
export class PageCollectionsController {
  constructor(
    private readonly pageSchemaService: PageSchemaService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PageReadThrottlerGuard)
  async listCollections(@Param('spaceId') spaceId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.pageSchemaService.listCollections(spaceId, workspace.id, payload.sub, payload.role);
  }
}
