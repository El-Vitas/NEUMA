import { API_SEGMENTS, RESOURCE_ROUTES } from '@neuma/shared';

const API_V1_PREFIX = '/api/v1';

export const ROUTES = {
  LOGIN: '/login',
  PORTAL: '/',
  PORTAL_SPACES: '/spaces',
  PORTAL_SPACES_NEW: '/spaces/new',
  PORTAL_SPACE: (spaceId: string) => `/spaces/${spaceId}`,
  PORTAL_SPACE_SETTINGS: (spaceId: string) => `/spaces/${spaceId}/settings`,
  PORTAL_SPACE_PAGE: (spaceId: string, pageId: string) => `/spaces/${spaceId}/pages/${pageId}`,
  PORTAL_ACCOUNT: '/account',
  PORTAL_SETTINGS: '/settings',
  PORTAL_SETTINGS_TOKENS: '/settings/tokens',
  PORTAL_SETTINGS_TOKEN_NEW: '/settings/tokens/new',
  PORTAL_SETTINGS_TOKEN: (tokenId: string) => `/settings/tokens/${tokenId}`,
  PORTAL_SETTINGS_WORKSPACE_TOKENS: '/settings/workspace-tokens',
  PORTAL_USERS: '/users',
  PORTAL_SEARCH: '/search',
  PORTAL_TRASH: '/trash',
  PORTAL_DOCS: '/docs',
  PORTAL_DOC: (slug: string) => `/docs/${slug}`,
} as const;

export const API_ROUTES = {
  AUTH_SESSIONS: `${API_V1_PREFIX}/${RESOURCE_ROUTES.AUTH}/${API_SEGMENTS.SESSIONS}`,
  AUTH_SESSIONS_REFRESH: `${API_V1_PREFIX}/${RESOURCE_ROUTES.AUTH}/${API_SEGMENTS.SESSIONS}/${API_SEGMENTS.REFRESH}`,
  AUTH_SESSIONS_CURRENT: `${API_V1_PREFIX}/${RESOURCE_ROUTES.AUTH}/${API_SEGMENTS.SESSIONS}/${API_SEGMENTS.CURRENT}`,
  USERS: `${API_V1_PREFIX}/${RESOURCE_ROUTES.USERS}`,
  USERS_ME: `${API_V1_PREFIX}/${RESOURCE_ROUTES.USERS}/${API_SEGMENTS.ME}`,
  SEARCH: `${API_V1_PREFIX}/search`,
  COLLABORATION_TOKEN: `${API_V1_PREFIX}/collaboration/token`,
} as const;
