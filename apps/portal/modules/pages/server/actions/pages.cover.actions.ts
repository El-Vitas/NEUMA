'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { actionClient } from '@/lib/safe-action';
import { PAGES_CACHE_TAG } from '@/shared/constants/pages-cache.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { authenticatedRequest } from '@/shared/server/lib/authenticated-request.server';
import { PAGE_COVER_API_ROUTE, PAGE_COVER_DEFAULT_POSITION } from '../../constants/pages.cover.constants';
import {
  pageCoverImageUploadSchema,
  pageCoverRemoveSchema,
  pageCoverRepositionSchema,
} from '../../schemas/pages.cover.schemas';
import { pageSummarySchema } from '../../schemas/pages.schemas';
import { uploadPageImageAssetId } from '../lib/pages.attachments.server';
import { deletePageAttachmentAction } from './pages.attachments.actions';

/** The image a cover replaces is let go of, so a page does not hoard the pictures it stopped showing. */
const removePreviousCoverAsset = async (previousAssetId: string | undefined): Promise<void> => {
  if (previousAssetId === undefined) return;
  await deletePageAttachmentAction({ attachmentId: previousAssetId });
};

export const uploadPageCoverImageAction = actionClient
  .inputSchema(pageCoverImageUploadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'uploadPageCoverImage' }, async () => {
      const accessToken = await requireAccessTokenCookie();
      const assetId = await uploadPageImageAssetId(
        parsedInput.pageId,
        parsedInput.file,
        accessToken,
        'Page cover image upload failed',
      );
      const updated = await authenticatedRequest(
        PAGE_COVER_API_ROUTE(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        { cover: { assetId, position: PAGE_COVER_DEFAULT_POSITION } },
      );
      await removePreviousCoverAsset(parsedInput.previousAssetId);
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(updated);
    }),
  );

export const repositionPageCoverAction = actionClient
  .inputSchema(pageCoverRepositionSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'repositionPageCover' }, async () => {
      const updated = await authenticatedRequest(
        PAGE_COVER_API_ROUTE(parsedInput.spaceId, parsedInput.pageId),
        'PATCH',
        { cover: { assetId: parsedInput.assetId, position: parsedInput.position } },
      );
      updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
      return pageSummarySchema.parse(updated);
    }),
  );

export const removePageCoverAction = actionClient.inputSchema(pageCoverRemoveSchema).action(async ({ parsedInput }) =>
  withAction({ action: 'removePageCover' }, async () => {
    const updated = await authenticatedRequest(PAGE_COVER_API_ROUTE(parsedInput.spaceId, parsedInput.pageId), 'PATCH', {
      cover: null,
    });
    await removePreviousCoverAsset(parsedInput.previousAssetId);
    updateTag(PAGES_CACHE_TAG(parsedInput.spaceId));
    return pageSummarySchema.parse(updated);
  }),
);
