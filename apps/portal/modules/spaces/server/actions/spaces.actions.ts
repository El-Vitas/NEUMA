'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { SPACE_API_ROUTES, SPACES_CACHE_TAG } from '../../constants/spaces.constants';
import { createSpaceSchema, spaceSummarySchema } from '../../schemas/spaces.schemas';

export const createSpaceAction = actionClient.schema(createSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'createSpace' }, async () => {
    const createdSpace = await apiServer.post<unknown>(SPACE_API_ROUTES.list, parsedInput);
    updateTag(SPACES_CACHE_TAG);
    return spaceSummarySchema.parse(createdSpace);
  }),
);
