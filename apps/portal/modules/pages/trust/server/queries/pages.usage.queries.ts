import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import {
  PAGE_USAGE_API_ROUTES,
  PAGE_USAGE_SETTINGS_CACHE_TAG,
  PAGE_USAGE_SUMMARY_CACHE_TAG,
} from '../../constants/pages.usage.constants';
import { pageUsageSettingsSchema, pageUsageSummarySchema } from '../../schemas/pages.usage.schemas';
import type { PageUsageSettings, PageUsageSummary } from '../../types/pages.usage.types';

export const getPageUsageSummary = async (pageId: string): Promise<Result<PageUsageSummary, Error>> =>
  withQuery({ op: 'getPageUsageSummary', params: { pageId } }, (accessToken) =>
    getPageUsageSummaryCached(accessToken, pageId),
  );

const getPageUsageSummaryCached = async (accessToken: string, pageId: string): Promise<PageUsageSummary> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_USAGE_SUMMARY_CACHE_TAG(pageId));

  const response = await apiRequest<unknown>(PAGE_USAGE_API_ROUTES.summary(pageId), accessToken);
  return pageUsageSummarySchema.parse(response);
};

export const getPageUsageSettings = async (): Promise<Result<PageUsageSettings, Error>> =>
  withQuery({ op: 'getPageUsageSettings' }, (accessToken) => getPageUsageSettingsCached(accessToken));

const getPageUsageSettingsCached = async (accessToken: string): Promise<PageUsageSettings> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_USAGE_SETTINGS_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_USAGE_API_ROUTES.settings, accessToken);
  return pageUsageSettingsSchema.parse(response);
};
