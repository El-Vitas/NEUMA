import { buildPageTrashListQuerySuffix } from '../lib/pages.trash.lib';

export const PAGE_TRASH_CACHE_TAG = 'pages-trash';

export const PAGE_TRASH_API_ROUTES = {
  empty: (spaceId?: string) => `/api/v1/pages/trash${buildPageTrashListQuerySuffix(spaceId)}`,
  list: (spaceId?: string, search?: string) => `/api/v1/pages/trash${buildPageTrashListQuerySuffix(spaceId, search)}`,
  restorePreview: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/restore-preview`,
  trashPreview: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/trash-preview`,
} as const;
