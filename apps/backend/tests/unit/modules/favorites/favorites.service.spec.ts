import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@company-brain/db';
import { USER_ROLE } from '@company-brain/shared';
import type {
  AccessibleFavoritePage,
  FavoritePageSummary,
  FavoriteRow,
} from '@/modules/favorites/domain/favorite.domain.types';
import { FavoritesService } from '@/modules/favorites/favorites.service';
import type { FavoriteRepositoryContract } from '@/modules/favorites/types/favorite.types';

const accessiblePage: AccessibleFavoritePage = {
  id: 'page-a',
  lifecycle: PageLifecycle.ACTIVE,
  spaceId: 'space-a',
  title: 'Handbook',
};

const favoriteRow: FavoriteRow = { id: 'favorite-a', order: 0, pageId: 'page-a' };

const favoriteSummary: FavoritePageSummary = {
  favoriteId: 'favorite-a',
  lifecycle: PageLifecycle.ACTIVE,
  order: 0,
  pageId: 'page-a',
  spaceId: 'space-a',
  title: 'Handbook',
};

const createRepository = (overrides: Partial<FavoriteRepositoryContract> = {}): FavoriteRepositoryContract => ({
  addFavorite: () => Promise.resolve(favoriteRow),
  findAccessiblePage: () => Promise.resolve(accessiblePage),
  listFavorites: () => Promise.resolve([favoriteSummary]),
  moveFavorite: () => Promise.resolve(true),
  removeFavorite: () => Promise.resolve(undefined),
  ...overrides,
});

describe('favorites service — addFavorite', () => {
  it('adds a page the caller can access', async () => {
    const service = new FavoritesService(createRepository());

    const result = await service.addFavorite('page-a', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual(favoriteSummary);
  });

  it('refuses to favorite a page the caller cannot access', async () => {
    const repository = createRepository({ findAccessiblePage: () => Promise.resolve(null) });
    const service = new FavoritesService(repository);

    const result = await service.addFavorite('page-a', 'user-a', 'workspace-a', USER_ROLE.CLIENT);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('FAVORITE_PAGE_ACCESS_DENIED');
  });
});

describe('favorites service — moveFavorite', () => {
  it('returns the reordered list after a successful move', async () => {
    const service = new FavoritesService(createRepository());

    const result = await service.moveFavorite('page-a', 'up', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isOk()).toBe(true);
    expect(result.getValue()).toEqual([favoriteSummary]);
  });

  it('fails when the page is not among the caller favorites', async () => {
    const repository = createRepository({ moveFavorite: () => Promise.resolve(false) });
    const service = new FavoritesService(repository);

    const result = await service.moveFavorite('page-a', 'up', 'user-a', 'workspace-a', USER_ROLE.WORKER);

    expect(result.isFail()).toBe(true);
    expect(result.getError().code).toBe('FAVORITE_NOT_FOUND');
  });
});

describe('favorites service — removeFavorite', () => {
  it('delegates removal to the repository for the caller and page given', async () => {
    const received: { current: { pageId: string; userId: string } | null } = { current: null };
    const repository = createRepository({
      removeFavorite: (userId, pageId) => {
        received.current = { pageId, userId };
        return Promise.resolve(undefined);
      },
    });
    const service = new FavoritesService(repository);

    await service.removeFavorite('page-a', 'user-a');

    expect(received.current).toEqual({ pageId: 'page-a', userId: 'user-a' });
  });
});
