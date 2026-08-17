import type {
  AccessibleFavoritePage,
  FavoriteMoveDirection,
  FavoritePageSummary,
  FavoriteRow,
} from './favorite.domain.types';

export const mapFavoritesToPageSummaries = (
  favorites: readonly FavoriteRow[],
  accessiblePages: readonly AccessibleFavoritePage[],
): readonly FavoritePageSummary[] => {
  const pageById = new Map(accessiblePages.map((page) => [page.id, page]));
  return favorites.flatMap((favorite) => {
    const page = pageById.get(favorite.pageId);
    if (page === undefined) return [];
    return [
      {
        favoriteId: favorite.id,
        lifecycle: page.lifecycle,
        order: favorite.order,
        pageId: page.id,
        spaceId: page.spaceId,
        title: page.title,
      },
    ];
  });
};

export const resolveFavoriteSwapIndex = (
  currentIndex: number,
  direction: FavoriteMoveDirection,
  favoriteCount: number,
): number | null => {
  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  return swapIndex >= 0 && swapIndex < favoriteCount ? swapIndex : null;
};
