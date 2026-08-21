import type { PageUsageSummary } from '../types/pages.usage.types';

export const PAGE_USAGE_SUMMARY_CACHE_TAG = (pageId: string): string => `page-usage:${pageId}`;

export const PAGE_USAGE_SETTINGS_CACHE_TAG = 'page-usage-settings';

export const PAGE_USAGE_API_ROUTES = {
  record: (pageId: string) => `/api/v1/page-views/pages/${pageId}`,
  settings: '/api/v1/page-views/settings',
  summary: (pageId: string) => `/api/v1/page-views/pages/${pageId}`,
} as const;

export const EMPTY_PAGE_USAGE_SUMMARY: PageUsageSummary = { viewCount: 0, viewers: [] };
