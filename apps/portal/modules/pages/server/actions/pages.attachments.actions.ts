'use server';

import 'server-only';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { actionClient } from '@/lib/safe-action';
import { config } from '@/shared/config';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { readAccessTokenCookie, requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { withAction } from '@/shared/lib/with-action.lib';
import { FILES_API_ROUTE, PAGE_ATTACHMENTS_CACHE_TAG } from '../../constants/pages.attachments.constants';
import {
  attachmentIdSchema,
  attachmentSummarySchema,
  attachmentUploadSchema,
} from '../../schemas/pages.attachments.schemas';
import type { AttachmentActionResult } from '../../types/pages.attachments.types';
import { getPageAttachmentDownload } from '../lib/pages.attachments.server';

const uploadAttachment = async (pageId: string, file: File, accessToken: string): Promise<Response> => {
  const body = new FormData();
  body.append('file', file, file.name);
  return fetch(`${config.backendApiUrl}${FILES_API_ROUTE}?pageId=${encodeURIComponent(pageId)}`, {
    body,
    headers: { authorization: `${BEARER_PREFIX}${accessToken}` },
    method: 'POST',
  });
};

export const uploadPageAttachmentAction = async (formData: FormData): Promise<AttachmentActionResult> => {
  const accessToken = await readAccessTokenCookie();
  if (accessToken === undefined) return { error: 'request', ok: false };

  const parsed = attachmentUploadSchema.safeParse({ file: formData.get('file'), pageId: formData.get('pageId') });
  if (!parsed.success) return { error: 'invalid', ok: false };

  const response = await uploadAttachment(parsed.data.pageId, parsed.data.file, accessToken);
  if (!response.ok) return { error: 'request', ok: false };
  const attachment = attachmentSummarySchema.safeParse(await response.json());
  if (!attachment.success) return { error: 'request', ok: false };
  updateTag(PAGE_ATTACHMENTS_CACHE_TAG);
  return { attachment: attachment.data, ok: true };
};

export const downloadPageAttachmentAction = actionClient
  .schema(z.object({ attachmentId: attachmentIdSchema }))
  .action(async ({ parsedInput }) =>
    withAction({ action: 'downloadPageAttachment' }, () => getPageAttachmentDownload(parsedInput.attachmentId)),
  );

export const deletePageAttachmentAction = actionClient
  .schema(z.object({ attachmentId: attachmentIdSchema }))
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
