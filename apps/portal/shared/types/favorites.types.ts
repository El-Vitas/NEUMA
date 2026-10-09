import type { PageLifecycle } from '@neuma/shared';

export interface FavoritePage {
  readonly favoriteId: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}
