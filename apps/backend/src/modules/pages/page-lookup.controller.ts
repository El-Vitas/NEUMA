import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { PageReadThrottlerGuard } from '../../common/infrastructure/guards/page-read-throttler.guard';
import type { TokenPayload } from '../../common/types/auth.types';
import { PageLookupContentDto, PageLookupDto } from './dto/page-lookup.dto';
import { PageTreeService } from './page-tree.service';
import type { PageLookupContent, PageLookupEntry } from './types/page-tree.types';

/** Many pages by id in one request, across spaces: a page that is missing and one that is closed look the same. */
@Controller('pages')
export class PageLookupController {
  constructor(private readonly treeService: PageTreeService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PageReadThrottlerGuard)
  async lookup(
    @Body() dto: PageLookupDto,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly pages: readonly PageLookupEntry[] }> {
    return { pages: await this.treeService.lookup(dto.ids, await this.treeService.openReader(payload)) };
  }

  @Post('lookup-content')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PageReadThrottlerGuard)
  async lookupContent(
    @Body() dto: PageLookupContentDto,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly pages: readonly PageLookupContent[] }> {
    return { pages: await this.treeService.lookupContent(dto.ids, await this.treeService.openReader(payload)) };
  }
}
