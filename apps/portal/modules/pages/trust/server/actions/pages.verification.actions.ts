'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_API_ROUTES } from '../../../constants/pages.constants';
import { pageSummarySchema, pageVerificationSchema } from '../../../schemas/pages.schemas';

/** Verifying again re-stamps the verifier and time on purpose: it is how an expiration is extended. */
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
