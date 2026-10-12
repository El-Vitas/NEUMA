'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { SPACE_API_ROUTES, SPACES_CACHE_TAG, SPACES_SHARED_WITH_ME_CACHE_TAG } from '../../constants/spaces.constants';
import {
  createSpaceSchema,
  describeSpaceSchema,
  renameSpaceSchema,
  reorderSpaceSchema,
  shareSpaceSchema,
  spaceSummarySchema,
  spacesListSchema,
} from '../../schemas/spaces.schemas';

export const createSpaceAction = actionClient.inputSchema(createSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'createSpace' }, async () => {
    const createdSpace = await apiServer.post<unknown>(SPACE_API_ROUTES.list, parsedInput);
    updateTag(SPACES_CACHE_TAG);
    return spaceSummarySchema.parse(createdSpace);
  }),
);

export const reorderSpaceAction = actionClient.inputSchema(reorderSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'reorderSpaces' }, async () => {
    const spaces = await apiServer.patch<unknown>(SPACE_API_ROUTES.order(parsedInput.spaceId), {
      beforeSpaceId: parsedInput.beforeSpaceId ?? undefined,
    });
    updateTag(SPACES_CACHE_TAG);
    return spacesListSchema.parse(spaces);
  }),
);

export const renameSpaceAction = actionClient.inputSchema(renameSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'renameSpace' }, async () => {
    const renamedSpace = await apiServer.patch<unknown>(SPACE_API_ROUTES.name(parsedInput.spaceId), {
      name: parsedInput.name,
    });
    updateTag(SPACES_CACHE_TAG);
    return spaceSummarySchema.parse(renamedSpace);
  }),
);

export const describeSpaceAction = actionClient.inputSchema(describeSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'describeSpace' }, async () => {
    const described = await apiServer.patch<unknown>(SPACE_API_ROUTES.description(parsedInput.spaceId), {
      description: parsedInput.description,
    });
    updateTag(SPACES_CACHE_TAG);
    return spaceSummarySchema.parse(described);
  }),
);

// Invalidates both lists: the owner's spaces and the invited member's shared-with-me spaces.
export const shareSpaceAction = actionClient.inputSchema(shareSpaceSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'shareSpace' }, async () => {
    await apiServer.post<unknown>(SPACE_API_ROUTES.members(parsedInput.spaceId), { userId: parsedInput.userId });
    updateTag(SPACES_CACHE_TAG);
    updateTag(SPACES_SHARED_WITH_ME_CACHE_TAG);
  }),
);
