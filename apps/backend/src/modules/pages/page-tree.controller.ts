import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageTreeQueryDto } from './dto/page-tree.query.dto';
import { PageRecentQueryDto } from './dto/page-tree.recent.dto';
import { PageTreeService } from './page-tree.service';
import type { PageRecentEntry, PageTreeAncestor, PageTreeChildren, PageTreePath } from './types/page-tree.types';

/** Declared before the controller of pages, whose `:pageId` would otherwise take `tree` and `recent` for ids. */
@Controller('spaces/:spaceId/pages')
export class PageTreeController {
  constructor(private readonly treeService: PageTreeService) {}

  @Get('tree')
  @UseGuards(JwtAuthGuard)
  async listChildren(
    @Param('spaceId') spaceId: string,
    @Query() dto: PageTreeQueryDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageTreeChildren & { readonly watermark: string }> {
    const reader = await this.treeService.openReader(payload);
    const watermark = await this.treeService.readWatermark();
    const children = await this.treeService.listChildren(spaceId, dto.parentId ?? null, reader, {
      skip: dto.skip,
      take: dto.take,
    });
    return { ...children, watermark };
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  async listRecent(
    @Param('spaceId') spaceId: string,
    @Query() dto: PageRecentQueryDto,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly entries: readonly PageRecentEntry[] }> {
    const reader = await this.treeService.openReader(payload);
    return { entries: await this.treeService.listRecent(spaceId, reader, dto.take) };
  }

  @Get(':pageId/path')
  @UseGuards(JwtAuthGuard)
  async readPath(@Param('pageId') pageId: string, @User('payload') payload: TokenPayload): Promise<PageTreePath> {
    return this.treeService.readPath(pageId, await this.treeService.openReader(payload));
  }

  @Get(':pageId/ancestors')
  @UseGuards(JwtAuthGuard)
  async listAncestors(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly ancestors: readonly PageTreeAncestor[] }> {
    const reader = await this.treeService.openReader(payload);
    return { ancestors: await this.treeService.listAncestors(pageId, reader) };
  }
}
