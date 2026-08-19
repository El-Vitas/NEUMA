'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { apiServer } from '@/shared/lib/api-server';
import { withAction } from '@/shared/lib/with-action.lib';
import { SPACE_API_ROUTES, SPACES_CACHE_TAG } from '../../constants/spaces.constants';
import {
  spaceIconEmojiInputSchema,
  spaceIconRemoveSchema,
  spaceIconSymbolInputSchema,
} from '../../schemas/spaces.icon.schemas';
import { spaceSummarySchema } from '../../schemas/spaces.schemas';

export const setSpaceIconEmojiAction = actionClient
  .inputSchema(spaceIconEmojiInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'setSpaceIconEmoji' }, async () => {
      const updated = await apiServer.patch<unknown>(SPACE_API_ROUTES.icon(parsedInput.spaceId), {
        icon: { kind: 'emoji', value: parsedInput.value },
      });
      updateTag(SPACES_CACHE_TAG);
      return spaceSummarySchema.parse(updated);
    }),
  );

export const setSpaceIconSymbolAction = actionClient
  .inputSchema(spaceIconSymbolInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'setSpaceIconSymbol' }, async () => {
      const updated = await apiServer.patch<unknown>(SPACE_API_ROUTES.icon(parsedInput.spaceId), {
        icon: { color: parsedInput.color, kind: 'symbol', name: parsedInput.name },
      });
      updateTag(SPACES_CACHE_TAG);
      return spaceSummarySchema.parse(updated);
    }),
  );

export const removeSpaceIconAction = actionClient.inputSchema(spaceIconRemoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'removeSpaceIcon' }, async () => {
    const updated = await apiServer.patch<unknown>(SPACE_API_ROUTES.icon(parsedInput.spaceId), { icon: null });
    updateTag(SPACES_CACHE_TAG);
    return spaceSummarySchema.parse(updated);
  }),
);
