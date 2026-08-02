export const SPACES_CACHE_TAG = 'spaces';

export const SPACE_ROUTES = {
  list: '/espacios',
  detail: (spaceId: string) => `/espacios/${spaceId}`,
} as const;

export const SPACE_API_ROUTES = {
  list: '/api/v1/spaces',
} as const;
