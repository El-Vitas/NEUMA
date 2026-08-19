import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { SearchQueryDto } from './dto/search.query.dto';
import { SearchService } from './search.service';
import type { SearchPageWithContext } from './types/search.types';
import { normalizeSearchQuery } from './utils/search.query.utils';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async search(@Query() dto: SearchQueryDto, @User('payload') payload: TokenPayload): Promise<SearchPageWithContext> {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.searchService.search({
      ...normalizeSearchQuery(dto),
      userId: payload.sub,
      userRole: payload.role,
      workspaceId: workspace.id,
    });
  }
}
