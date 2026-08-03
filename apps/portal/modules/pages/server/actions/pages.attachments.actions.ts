'use server';

import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { FILES_API_ROUTE } from '../../constants/pages.attachments.constants';
import {
  attachmentIdSchema,
  attachmentSummarySchema,
  attachmentUploadSchema,
} from '../../schemas/pages.attachments.schemas';
import type {
  AttachmentActionResult,
  AttachmentDeleteResult,
  AttachmentDownloadResult,
} from '../../types/pages.attachments.types';
import { getPageAttachmentDownload } from '../lib/pages.attachments.server';

const getAuthorizationHeaders = async (): Promise<HeadersInit> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  return accessToken === undefined ? {} : { authorization: `${BEARER_PREFIX}${accessToken}` };
};

const uploadAttachment = async (pageId: string, file: File): Promise<Response> => {
  const body = new FormData();
  body.append('file', file, file.name);
  return fetch(`${config.backendApiUrl}${FILES_API_ROUTE}?pageId=${encodeURIComponent(pageId)}`, {
    body,
    headers: await getAuthorizationHeaders(),
    method: 'POST',
  });
};

export const uploadPageAttachmentAction = async (formData: FormData): Promise<AttachmentActionResult> => {
  const parsed = attachmentUploadSchema.safeParse({ file: formData.get('file'), pageId: formData.get('pageId') });
  if (!parsed.success) return { error: 'invalid', ok: false };

  const response = await uploadAttachment(parsed.data.pageId, parsed.data.file);
  if (!response.ok) return { error: 'request', ok: false };
  const attachment = attachmentSummarySchema.safeParse(await response.json());
  if (!attachment.success) return { error: 'request', ok: false };
  return { attachment: attachment.data, ok: true };
};

export const downloadPageAttachmentAction = async (attachmentId: string): Promise<AttachmentDownloadResult> =>
  getPageAttachmentDownload(attachmentId);

export const deletePageAttachmentAction = async (attachmentId: string): Promise<AttachmentDeleteResult> => {
  if (!attachmentIdSchema.safeParse(attachmentId).success) return { error: 'invalid', ok: false };
  const response = await fetch(`${config.backendApiUrl}${FILES_API_ROUTE}/${encodeURIComponent(attachmentId)}`, {
    headers: await getAuthorizationHeaders(),
    method: 'DELETE',
  });
  return response.ok ? { ok: true } : { error: 'request', ok: false };
};
