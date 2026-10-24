import { Body, Controller, Param, Post, Put, UseGuards } from '@nestjs/common';
import type { PageContent } from '@neuma/shared';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { BlockWriteThrottlerGuard } from '../../common/infrastructure/guards/block-write-throttler.guard';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { AppendPageBlocksDto, ReplacePageContentDto } from './dto/page.content.dto';
import { PageContentService } from './page.content.service';
import type { PageContentWriter } from './types/page.types';

/** Writes page content from outside the editor, always through the live document. */
@Controller('spaces/:spaceId/pages/:pageId')
@UseGuards(JwtAuthGuard, BlockWriteThrottlerGuard)
export class PageContentController {
  constructor(
    private readonly pageContentService: PageContentService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Put('content')
  async replace(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Body() dto: ReplacePageContentDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageContent> {
    const writer = await this.resolveWriter(spaceId, pageId, payload);
    const result = await this.pageContentService.replace(writer, dto.content);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  @Post('blocks')
  async append(
    @Param('spaceId') spaceId: string,
    @Param('pageId') pageId: string,
    @Body() dto: AppendPageBlocksDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageContent> {
    const writer = await this.resolveWriter(spaceId, pageId, payload);
    const result = await this.pageContentService.append(writer, dto.blocks);
    if (result.isFail()) throw result.getError();
    return result.getValue();
  }

  private async resolveWriter(spaceId: string, pageId: string, payload: TokenPayload): Promise<PageContentWriter> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return { pageId, role: payload.role, spaceId, userId: payload.sub, workspaceId: workspace.id };
  }
}
