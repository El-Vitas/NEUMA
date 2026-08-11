export const SPACES_CACHE_TAG = 'spaces';
export const SPACE_MEMBERS_CACHE_TAG = (spaceId: string): string => `space-members:${spaceId}`;
export const SPACE_NAME_MAX_LENGTH = 120;
export const SPACE_SLUG_MAX_LENGTH = 80;

export const SPACE_API_ROUTES = {
  list: '/api/v1/spaces',
  members: (spaceId: string) => `/api/v1/spaces/${spaceId}/members`,
} as const;
