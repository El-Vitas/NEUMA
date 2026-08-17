export const SPACE_MEMBERS_API_ROUTE = (spaceId: string): string => `/api/v1/spaces/${spaceId}/members`;

export const SPACE_MEMBERS_CACHE_TAG = (spaceId: string): string => `space-members:${spaceId}`;
