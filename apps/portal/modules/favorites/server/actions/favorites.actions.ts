'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { FAVORITE_API_ROUTES, FAVORITES_CACHE_TAG } from '../../constants/favorites.constants';
import {
  favoriteMoveSchema,
  favoriteMutationSchema,
  favoritePageSchema,
  favoritePagesListSchema,
} from '../../schemas/favorites.schemas';

export const addFavoriteAction = actionClient.inputSchema(favoriteMutationSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'addFavorite' }, async () => {
    const favorite = await apiServer.post<unknown>(FAVORITE_API_ROUTES.item(parsedInput.pageId), {});
    updateTag(FAVORITES_CACHE_TAG);
    return favoritePageSchema.parse(favorite);
  }),
);

export const removeFavoriteAction = actionClient.inputSchema(favoriteMutationSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'removeFavorite' }, async () => {
    await apiServer.del(FAVORITE_API_ROUTES.item(parsedInput.pageId));
    updateTag(FAVORITES_CACHE_TAG);
  }),
);

export const moveFavoriteAction = actionClient.inputSchema(favoriteMoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'moveFavorite' }, async () => {
    const favorites = await apiServer.patch<unknown>(FAVORITE_API_ROUTES.move(parsedInput.pageId), {
      direction: parsedInput.direction,
    });
    updateTag(FAVORITES_CACHE_TAG);
    return favoritePagesListSchema.parse(favorites);
  }),
);
