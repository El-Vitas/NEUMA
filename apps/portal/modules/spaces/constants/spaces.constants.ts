export const SPACES_CACHE_TAG = 'spaces';
export const SPACES_SHARED_WITH_ME_CACHE_TAG = 'spaces-shared-with-me';
export const SPACE_NAME_MAX_LENGTH = 120;
export const SPACE_SLUG_MAX_LENGTH = 80;

export const SPACE_API_ROUTES = {
  icon: (spaceId: string): string => `/api/v1/spaces/${spaceId}/icon`,
  list: '/api/v1/spaces',
  members: (spaceId: string): string => `/api/v1/spaces/${spaceId}/members`,
  name: (spaceId: string): string => `/api/v1/spaces/${spaceId}/name`,
  order: (spaceId: string): string => `/api/v1/spaces/${spaceId}/order`,
  sharedWithMe: '/api/v1/spaces/shared-with-me',
} as const;
