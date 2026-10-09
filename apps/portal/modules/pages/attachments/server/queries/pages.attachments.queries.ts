import 'server-only';

import type { Result } from '@neuma/shared';
import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import { apiRequest } from '@/shared/lib/api-server';
import { withQuery } from '@/shared/lib/with-query.lib';
import { PAGE_ATTACHMENTS_API_ROUTE, PAGE_ATTACHMENTS_CACHE_TAG } from '../../constants/pages.attachments.constants';
import { attachmentSummarySchema } from '../../schemas/pages.attachments.schemas';
import type { AttachmentSummary } from '../../types/pages.attachments.types';

export const getPageAttachments = async (pageId: string): Promise<Result<readonly AttachmentSummary[], Error>> =>
  withQuery({ op: 'getPageAttachments', params: { pageId } }, (accessToken) =>
    getPageAttachmentsCached(accessToken, pageId),
  );

const getPageAttachmentsCached = async (accessToken: string, pageId: string): Promise<readonly AttachmentSummary[]> => {
  'use cache';
  cacheLife('seconds');
  cacheTag(PAGE_ATTACHMENTS_CACHE_TAG);

  const response = await apiRequest<unknown>(PAGE_ATTACHMENTS_API_ROUTE(pageId), accessToken);
  return z.array(attachmentSummarySchema).parse(response);
};
