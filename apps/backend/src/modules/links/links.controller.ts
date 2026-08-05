import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { LinksService } from './links.service';
import type { BacklinksResult } from './types/links.types';

@Controller('pages/:pageId/backlinks')
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listBacklinks(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<BacklinksResult> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.linksService.listBacklinks(pageId, workspace.id, payload.sub, payload.role);
  }
}
