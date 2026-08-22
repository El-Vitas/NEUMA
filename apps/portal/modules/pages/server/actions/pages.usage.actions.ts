'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiRequest } from '@/shared/lib/api-server';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import {
  PAGE_USAGE_API_ROUTES,
  PAGE_USAGE_SETTINGS_CACHE_TAG,
  PAGE_USAGE_SUMMARY_CACHE_TAG,
} from '../../constants/pages.usage.constants';
import {
  pageUsageRecordSchema,
  pageUsageSettingsSchema,
  pageUsageSettingsUpdateSchema,
  pageUsageSummarySchema,
} from '../../schemas/pages.usage.schemas';
import type { PageUsageReport, PageUsageSettings } from '../../types/pages.usage.types';

export const recordPageViewAction = actionClient.inputSchema(pageUsageRecordSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'recordPageView' }, async (): Promise<void> => {
    await authenticatedRequest(PAGE_USAGE_API_ROUTES.record(parsedInput.pageId), 'POST', {});
    updateTag(PAGE_USAGE_SUMMARY_CACHE_TAG(parsedInput.pageId));
  }),
);

export const updatePageUsageSettingsAction = actionClient
  .inputSchema(pageUsageSettingsUpdateSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'updatePageUsageSettings' }, async (): Promise<PageUsageSettings> => {
      const response = await authenticatedRequest(PAGE_USAGE_API_ROUTES.settings, 'PATCH', {
        enabled: parsedInput.enabled,
      });
      updateTag(PAGE_USAGE_SETTINGS_CACHE_TAG);
      return pageUsageSettingsSchema.parse(response);
    }),
  );

/**
 * What a page's readership looks like, asked for only when somebody opens the
 * panel that shows it.
 *
 * Who read what is costly to gather and nobody's business by default, so it is
 * not carried along with every page: it is fetched the moment it is looked at,
 * and never before.
 */
export const getPageUsageReportAction = actionClient
  .inputSchema(pageUsageRecordSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'getPageUsageReport' }, async (): Promise<PageUsageReport> => {
      const accessToken = await requireAccessTokenCookie();
      const [summary, settings] = await Promise.all([
        apiRequest<unknown>(PAGE_USAGE_API_ROUTES.summary(parsedInput.pageId), accessToken),
        apiRequest<unknown>(PAGE_USAGE_API_ROUTES.settings, accessToken),
      ]);
      return {
        settings: pageUsageSettingsSchema.parse(settings),
        summary: pageUsageSummarySchema.parse(summary),
      };
    }),
  );
