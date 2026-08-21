'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { withAction } from '@/shared/lib/with-action.lib';
import { PAGE_API_ROUTES } from '../../constants/pages.constants';
import { pageSummarySchema, pageVerificationSchema } from '../../schemas/pages.schemas';
import { authenticatedRequest } from '../lib/pages.request.server';

/**
 * Vouches for a page, or takes that back.
 *
 * Asking to verify again — even with only a new expiration date — is the same
 * act repeated, so it re-stamps who verified it and when. That is deliberate:
 * it is what lets an expiration be pushed out without a separate endpoint.
 */
export const setPageVerificationAction = actionClient
  .inputSchema(pageVerificationSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'setPageVerification' }, async () => {
      const page = await authenticatedRequest(
        PAGE_API_ROUTES.verification(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        { expiresAt: parsedInput.expiresAt, verified: parsedInput.verified },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(page);
    }),
  );
