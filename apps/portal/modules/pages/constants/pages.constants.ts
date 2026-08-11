import type { AttachmentSummary } from '../types/pages.attachments.types';
import type { PageBacklinksResult } from '../types/pages.backlinks.types';

export const PAGES_CACHE_TAG = (spaceId: string): string => `pages:${spaceId}`;

export const PAGE_BACKLINKS_CACHE_TAG = (pageId: string): string => `page-backlinks:${pageId}`;

export const EMPTY_PAGE_BACKLINKS: PageBacklinksResult = { count: 0, items: [] };

export const EMPTY_PAGE_ATTACHMENTS: readonly AttachmentSummary[] = [];

export const PAGE_PROPERTIES_VISIBLE_LIMIT = 5;

export const PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME =
  'h-11 rounded-none border-transparent bg-transparent px-2 shadow-none hover:border-border dark:bg-transparent';

export const PAGE_API_ROUTES = {
  list: (spaceId: string, includeTrashed = false) =>
    `/api/v1/spaces/${spaceId}/pages?includeTrashed=${String(includeTrashed)}`,
  item: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}`,
  move: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/move`,
  trash: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/trash`,
  restore: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/restore`,
  backlinks: (pageId: string) => `/api/v1/pages/${pageId}/backlinks`,
  schema: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/schema`,
  rows: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/rows`,
  view: (spaceId: string, pageId: string, viewName: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/views/${encodeURIComponent(viewName)}`,
} as const;
