import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { User } from '../../common/infrastructure/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/infrastructure/guards/jwt.auth.guard';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import type { TokenPayload } from '../../common/types/auth.types';
import { MoveFavoriteDto } from './dto/favorite.move.dto';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    return this.favoritesService.listFavorites(payload.sub, workspace.id, payload.role);
  }

  @Post(':pageId')
  @UseGuards(JwtAuthGuard)
  async add(@Param('pageId') pageId: string, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.favoritesService.addFavorite(pageId, payload.sub, workspace.id, payload.role);
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }

  @Delete(':pageId')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('pageId') pageId: string,
    @User('payload') payload: TokenPayload,
  ): Promise<{ readonly pageId: string }> {
    await this.favoritesService.removeFavorite(pageId, payload.sub);
    return { pageId };
  }

  @Patch(':pageId/move')
  @UseGuards(JwtAuthGuard)
  async move(@Param('pageId') pageId: string, @Body() dto: MoveFavoriteDto, @User('payload') payload: TokenPayload) {
    const workspace = await this.workspaceContextService.resolveForUser(payload.sub, payload.role);
    const result = await this.favoritesService.moveFavorite(
      pageId,
      dto.direction,
      payload.sub,
      workspace.id,
      payload.role,
    );
    if (result.isFail()) {
      throw result.getError();
    }
    return result.getValue();
  }
}
