import type { PageLifecycle } from '@neuma/db';

export type FavoriteMoveDirection = 'down' | 'up';

export interface FavoritePageSummary {
  readonly favoriteId: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}

export interface FavoriteRow {
  readonly id: string;
  readonly order: number;
  readonly pageId: string;
}

export interface AccessibleFavoritePage {
  readonly id: string;
  readonly lifecycle: PageLifecycle;
  readonly spaceId: string;
  readonly title: string;
}
