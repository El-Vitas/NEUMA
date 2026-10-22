import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageMoveDestinationsQueryDto } from './dto/page.move-destinations.query.dto';
import { PageMoveDestinationsService } from './page.move-destinations.service';
import { PageTreeService } from './page-tree.service';
import type { PageMoveDestinations } from './types/page.types';

/** Move destinations across every space the reader can reach, not only the page's own space. */
@Controller('pages/move-destinations')
export class PageDestinationsController {
  constructor(
    private readonly moveDestinationsService: PageMoveDestinationsService,
    private readonly treeService: PageTreeService,
  ) {}

  @Get(':pageId')
  @UseGuards(JwtAuthGuard)
  async list(
    @Param('pageId') pageId: string,
    @Query() dto: PageMoveDestinationsQueryDto,
    @User('payload') payload: TokenPayload,
  ): Promise<PageMoveDestinations> {
    const reader = await this.treeService.openReader(payload);
    const result = await this.moveDestinationsService.list(pageId, dto.query.trim(), reader);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }
}
