'use server';

import 'server-only';

import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { API_ROUTES } from '@/shared/routes/constants/routes.constants';
import {
  pageCollaborationTokenRequestSchema,
  pageCollaborationTokenResponseSchema,
} from '../../schemas/pages.collaboration.schemas';

export const getPageCollaborationToken = actionClient
  .schema(pageCollaborationTokenRequestSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'getPageCollaborationToken' }, async () => {
      const response = await apiServer.post(API_ROUTES.COLLABORATION_TOKEN, {
        mode: 'write',
        pageId: parsedInput.pageId,
      });
      return pageCollaborationTokenResponseSchema.parse(response);
    }),
  );
