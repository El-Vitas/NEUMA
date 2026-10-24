import 'server-only';

import { config } from '@/shared/config';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { NetworkError } from '@/shared/lib/parse-json-body';
import { ATTACHMENT_FILENAME_PATTERN, FILES_API_ROUTE } from '../../constants/pages.attachments.constants';
import { attachmentSummarySchema } from '../../schemas/pages.attachments.schemas';
import type { AttachmentDownload } from '../../types/pages.attachments.types';

const askBackendForFile = async (address: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(address, init);
  } catch (error) {
    throw new NetworkError(error);
  }
};

/** Forwards `range`: without it the server answers with the whole file and media seeking breaks. */
export const getPageAttachmentResponse = async (
  attachmentId: string,
  accessToken: string,
  range: string | null = null,
): Promise<Response> =>
  askBackendForFile(`${config.backendApiUrl}${FILES_API_ROUTE}/${encodeURIComponent(attachmentId)}`, {
    headers:
      range === null
        ? { authorization: `${BEARER_PREFIX}${accessToken}` }
        : { authorization: `${BEARER_PREFIX}${accessToken}`, range },
  });

export const uploadPageAttachmentAsset = async (pageId: string, file: File, accessToken: string): Promise<Response> => {
  const body = new FormData();
  body.append('file', file, file.name);
  return askBackendForFile(`${config.backendApiUrl}${FILES_API_ROUTE}?pageId=${encodeURIComponent(pageId)}`, {
    body,
    headers: { authorization: `${BEARER_PREFIX}${accessToken}` },
    method: 'POST',
  });
};

export const uploadPageImageAssetId = async (
  pageId: string,
  file: File,
  accessToken: string,
  failureMessage: string,
): Promise<string> => {
  const response = await uploadPageAttachmentAsset(pageId, file, accessToken);
  if (!response.ok) throw new Error(failureMessage);
  return attachmentSummarySchema.parse(await response.json()).id;
};

const decodeFilename = (contentDisposition: string | null): string => {
  const encodedFilename = contentDisposition?.match(ATTACHMENT_FILENAME_PATTERN)?.[1];
  if (encodedFilename === undefined) return 'download';
  try {
    return decodeURIComponent(encodedFilename);
  } catch {
    return 'download';
  }
};

const readAttachmentDownload = async (response: Response): Promise<AttachmentDownload> => ({
  base64: Buffer.from(await response.arrayBuffer()).toString('base64'),
  mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  originalFilename: decodeFilename(response.headers.get('content-disposition')),
});

export const getPageAttachmentDownload = async (attachmentId: string): Promise<AttachmentDownload> => {
  const accessToken = await requireAccessTokenCookie();
  const response = await getPageAttachmentResponse(attachmentId, accessToken);
  if (!response.ok) throw new Error('Attachment download request failed');
  return readAttachmentDownload(response);
};
