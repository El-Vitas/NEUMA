'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { actionClient } from '@/lib/safe-action';
import { config } from '@/shared/config';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { FILES_API_ROUTE, PAGE_ATTACHMENTS_CACHE_TAG } from '../../constants/pages.attachments.constants';
import {
  attachmentIdSchema,
  attachmentSummarySchema,
  attachmentUploadSchema,
} from '../../schemas/pages.attachments.schemas';
import { getPageAttachmentDownload, uploadPageAttachmentAsset } from '../lib/pages.attachments.server';

export const uploadPageAttachmentAction = actionClient
  .inputSchema(attachmentUploadSchema)
  .action(async ({ parsedInput }) =>
    withAction({ action: 'uploadPageAttachment' }, async () => {
      const accessToken = await requireAccessTokenCookie();
      const response = await uploadPageAttachmentAsset(parsedInput.pageId, parsedInput.file, accessToken);
      if (!response.ok) throw new Error('Attachment upload request failed');
      const attachment = attachmentSummarySchema.parse(await response.json());
      updateTag(PAGE_ATTACHMENTS_CACHE_TAG);
      return attachment;
    }),
  );

export const downloadPageAttachmentAction = actionClient
  .inputSchema(z.object({ attachmentId: attachmentIdSchema }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'downloadPageAttachment' }, () => getPageAttachmentDownload(parsedInput.attachmentId)),
  );

export const deletePageAttachmentAction = actionClient
  .inputSchema(z.object({ attachmentId: attachmentIdSchema }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'deletePageAttachment' }, async () => {
      const accessToken = await requireAccessTokenCookie();
      const response = await fetch(
        `${config.backendApiUrl}${FILES_API_ROUTE}/${encodeURIComponent(parsedInput.attachmentId)}`,
        {
          headers: { authorization: `${BEARER_PREFIX}${accessToken}` },
          method: 'DELETE',
        },
      );
      if (!response.ok) throw new Error('Attachment delete request failed');
      updateTag(PAGE_ATTACHMENTS_CACHE_TAG);
    }),
  );
