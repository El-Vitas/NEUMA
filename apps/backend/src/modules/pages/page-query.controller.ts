import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { pageQueryRequestSchema } from '@neuma/shared';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageAccessDeniedError } from './domain/page.error';
import { PageQueryInvalidError } from './domain/page-query.error';
import { PageQueryDto } from './dto/page-query.dto';
import { PageQueryService } from './page-query.service';
import type { PageQueryResult } from './types/page-query.types';

@Controller('spaces/:spaceId/pages/:pageId')
export class PageQueryController {
  constructor(
    private readonly pageQueryService: PageQueryService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async query(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Body() dto: PageQueryDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageQueryResult> {
    const request = pageQueryRequestSchema.safeParse(dto);
    if (!request.success) throw new PageQueryInvalidError('The query does not fit', request.error.issues);
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.pageQueryService.run({
      pageId,
      request: request.data,
      role: payload.role,
      userId: payload.sub,
      workspaceId: workspace.id,
    });
    if (result.isFail()) throw result.getError();
    if (result.getValue().spaceId !== spaceId) throw new PageAccessDeniedError();
    return result.getValue();
  }
}
