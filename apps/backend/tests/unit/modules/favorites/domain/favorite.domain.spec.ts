import { describe, expect, it } from 'bun:test';
import { PageLifecycle } from '@company-brain/db';
import { mapFavoritesToPageSummaries, resolveFavoriteSwapIndex } from '@/modules/favorites/domain/favorite.domain';
import type { AccessibleFavoritePage, FavoriteRow } from '@/modules/favorites/domain/favorite.domain.types';

describe('mapFavoritesToPageSummaries', () => {
  const accessiblePage: AccessibleFavoritePage = {
    id: 'page-a',
    lifecycle: PageLifecycle.ACTIVE,
    spaceId: 'space-a',
    title: 'Handbook',
  };
  const favoriteRow: FavoriteRow = { id: 'favorite-a', order: 0, pageId: 'page-a' };

  it('merges a favorite with the page it points to, in favorite order', () => {
    const summaries = mapFavoritesToPageSummaries([favoriteRow], [accessiblePage]);

    expect(summaries).toEqual([
      {
        favoriteId: 'favorite-a',
        lifecycle: PageLifecycle.ACTIVE,
        order: 0,
        pageId: 'page-a',
        spaceId: 'space-a',
        title: 'Handbook',
      },
    ]);
  });

  it('drops a favorite whose page is no longer accessible', () => {
    const summaries = mapFavoritesToPageSummaries([favoriteRow], []);

    expect(summaries).toEqual([]);
  });

  it('keeps the order the favorites were given in, not the accessible-pages order', () => {
    const secondFavorite: FavoriteRow = { id: 'favorite-b', order: 1, pageId: 'page-b' };
    const secondPage: AccessibleFavoritePage = { ...accessiblePage, id: 'page-b', title: 'Roadmap' };

    const summaries = mapFavoritesToPageSummaries([favoriteRow, secondFavorite], [secondPage, accessiblePage]);

    expect(summaries.map((summary) => summary.pageId)).toEqual(['page-a', 'page-b']);
  });
});

describe('resolveFavoriteSwapIndex', () => {
  it('moves one position up when a predecessor exists', () => {
    expect(resolveFavoriteSwapIndex(1, 'up', 3)).toBe(0);
  });

  it('moves one position down when a successor exists', () => {
    expect(resolveFavoriteSwapIndex(1, 'down', 3)).toBe(2);
  });

  it('refuses to move up past the first position', () => {
    expect(resolveFavoriteSwapIndex(0, 'up', 3)).toBeNull();
  });

  it('refuses to move down past the last position', () => {
    expect(resolveFavoriteSwapIndex(2, 'down', 3)).toBeNull();
  });
});
