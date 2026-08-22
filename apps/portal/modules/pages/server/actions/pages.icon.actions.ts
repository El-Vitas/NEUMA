'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_ICON_ACTION_SUBJECT, PAGE_ICON_API_ROUTE } from '../../constants/pages.icon.constants';
import {
  pageIconEmojiInputSchema,
  pageIconImageUploadSchema,
  pageIconRemoveSchema,
  pageIconSymbolInputSchema,
} from '../../schemas/pages.icon.schemas';
import { pageSummarySchema } from '../../schemas/pages.schemas';
import { uploadPageImageAssetId } from '../lib/pages.attachments.server';
import { deletePageAttachmentAction } from './pages.attachments.actions';

const uploadPageIconImageAsset = (pageId: string, file: File, accessToken: string): Promise<string> =>
  uploadPageImageAssetId(pageId, file, accessToken, 'Page icon image upload failed');

const removePreviousIconAsset = async (previousAssetId: string | undefined): Promise<void> => {
  if (previousAssetId === undefined) return;
  await deletePageAttachmentAction({ attachmentId: previousAssetId });
};

export const setPageIconEmojiAction = actionClient
  .inputSchema(pageIconEmojiInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: `set${PAGE_ICON_ACTION_SUBJECT}Emoji` }, async () => {
      const updated = await authenticatedRequest(
        PAGE_ICON_API_ROUTE(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        {
          icon: { kind: 'emoji', value: parsedInput.value },
        },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(updated);
    }),
  );

export const setPageIconSymbolAction = actionClient
  .inputSchema(pageIconSymbolInputSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: `set${PAGE_ICON_ACTION_SUBJECT}Symbol` }, async () => {
      const updated = await authenticatedRequest(
        PAGE_ICON_API_ROUTE(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        {
          icon: { color: parsedInput.color, kind: 'symbol', name: parsedInput.name },
        },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(updated);
    }),
  );

export const uploadPageIconImageAction = actionClient
  .inputSchema(pageIconImageUploadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'uploadPageIconImage' }, async () => {
      const accessToken = await requireAccessTokenCookie();
      const assetId = await uploadPageIconImageAsset(parsedInput.pageId, parsedInput.file, accessToken);
      const updated = await authenticatedRequest(
        PAGE_ICON_API_ROUTE(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        {
          icon: { assetId, kind: 'image' },
        },
      );
      await removePreviousIconAsset(parsedInput.previousAssetId);
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(updated);
    }),
  );

export const removePageIconAction = actionClient.inputSchema(pageIconRemoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'removePageIcon' }, async () => {
    const updated = await authenticatedRequest(PAGE_ICON_API_ROUTE(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      icon: null,
    });
    await removePreviousIconAsset(parsedInput.previousAssetId);
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(updated);
  }),
);
