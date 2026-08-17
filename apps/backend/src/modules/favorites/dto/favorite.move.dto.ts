import { IsIn } from 'class-validator';
import { FAVORITE_MOVE_DIRECTIONS } from '../constants/favorites.constants';
import type { FavoriteMoveDirection } from '../domain/favorite.domain.types';

export class MoveFavoriteDto {
  @IsIn(FAVORITE_MOVE_DIRECTIONS)
  direction!: FavoriteMoveDirection;
}
