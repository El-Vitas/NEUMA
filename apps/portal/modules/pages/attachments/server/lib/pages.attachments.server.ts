import 'server-only';

import { config } from '@/shared/config';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { NetworkError } from '@/shared/lib/parse-json-body';
import { ATTACHMENT_FILENAME_PATTERN, FILES_API_ROUTE } from '../../constants/pages.attachments.constants';
import { attachmentSummarySchema } from '../../schemas/pages.attachments.schemas';
import type { AttachmentDownload } from '../../types/pages.attachments.types';

/** A file sent to or asked of the backend; not reaching it is being offline, said the way every other call says it. */
const askBackendForFile = async (address: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(address, init);
  } catch (error) {
    throw new NetworkError(error);
  }
};

/**
 * The stretch a player asked for travels with the request: dropping it here
 * would leave the page asking for a piece and the server answering with the
 * whole file, which is a seek bar that does not move.
 */
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
  return encodedFilename === undefined ? 'download' : decodeURIComponent(encodedFilename);
};

const readAttachmentDownload = async (response: Response): Promise<AttachmentDownload> => ({
  body: Array.from(new Uint8Array(await response.arrayBuffer())),
  mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  originalFilename: decodeFilename(response.headers.get('content-disposition')),
});

export const getPageAttachmentDownload = async (attachmentId: string): Promise<AttachmentDownload> => {
  const accessToken = await requireAccessTokenCookie();
  const response = await getPageAttachmentResponse(attachmentId, accessToken);
  if (!response.ok) throw new Error('Attachment download request failed');
  return readAttachmentDownload(response);
};
