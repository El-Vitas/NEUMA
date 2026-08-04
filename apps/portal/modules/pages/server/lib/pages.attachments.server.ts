import 'server-only';

import { config } from '@/shared/config';
import { BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { requireAccessTokenCookie } from '@/shared/lib/auth.token.lib';
import { FILES_API_ROUTE } from '../../constants/pages.attachments.constants';
import type { AttachmentDownload } from '../../types/pages.attachments.types';

const attachmentFilenamePattern = /filename\*=UTF-8''([^;]+)/iu;

const getAttachmentDownloadRequest = async (attachmentId: string, accessToken: string): Promise<Response> =>
  fetch(`${config.backendApiUrl}${FILES_API_ROUTE}/${encodeURIComponent(attachmentId)}`, {
    headers: { authorization: `${BEARER_PREFIX}${accessToken}` },
  });

const decodeFilename = (contentDisposition: string | null): string => {
  const encodedFilename = contentDisposition?.match(attachmentFilenamePattern)?.[1];
  return encodedFilename === undefined ? 'download' : decodeURIComponent(encodedFilename);
};

const readAttachmentDownload = async (response: Response): Promise<AttachmentDownload> => ({
  body: Array.from(new Uint8Array(await response.arrayBuffer())),
  mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  originalFilename: decodeFilename(response.headers.get('content-disposition')),
});

export const getPageAttachmentDownload = async (attachmentId: string): Promise<AttachmentDownload> => {
  const accessToken = await requireAccessTokenCookie();
  const response = await getAttachmentDownloadRequest(attachmentId, accessToken);
  if (!response.ok) throw new Error('Attachment download request failed');
  return readAttachmentDownload(response);
};
