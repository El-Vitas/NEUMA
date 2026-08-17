import type { PageLifecycle } from '@company-brain/shared';

export interface FavoritePage {
  readonly favoriteId: string;
  readonly lifecycle: PageLifecycle;
  readonly order: number;
  readonly pageId: string;
  readonly spaceId: string;
  readonly title: string;
}
