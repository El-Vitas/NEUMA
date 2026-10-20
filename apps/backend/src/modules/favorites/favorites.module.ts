import { Module } from '@nestjs/common';
import { BlockAccessRepository } from '../../common/infrastructure/persistence/block-access.repository';
import { WorkspaceContextService } from '../../common/infrastructure/persistence/workspace-context.service';
import { FAVORITE_REPOSITORY } from './constants/favorites.constants';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { FavoriteRepository } from './infrastructure/persistence/favorite.repository';

@Module({
  controllers: [FavoritesController],
  exports: [FavoritesService],
  providers: [
    BlockAccessRepository,
    FavoriteRepository,
    { provide: FAVORITE_REPOSITORY, useExisting: FavoriteRepository },
    FavoritesService,
    WorkspaceContextService,
  ],
})
export class FavoritesModule {}
