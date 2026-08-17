export const FAVORITES_CACHE_TAG = 'favorites';

export const FAVORITE_API_ROUTES = {
  item: (pageId: string) => `/api/v1/favorites/${pageId}`,
  list: '/api/v1/favorites',
  move: (pageId: string) => `/api/v1/favorites/${pageId}/move`,
} as const;

export const FAVORITE_MOVE_DIRECTIONS = ['up', 'down'] as const;
