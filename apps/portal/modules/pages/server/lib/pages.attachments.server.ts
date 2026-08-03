import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/shared/config';
import { ACCESS_TOKEN_COOKIE, BEARER_PREFIX } from '@/shared/constants/auth.constants';
import { FILES_API_ROUTE } from '../../constants/pages.attachments.constants';
import { attachmentIdSchema } from '../../schemas/pages.attachments.schemas';
import type { AttachmentDownload, AttachmentDownloadResult } from '../../types/pages.attachments.types';

const attachmentFilenamePattern = /filename\*=UTF-8''([^;]+)/iu;

const getAttachmentDownloadRequest = async (attachmentId: string): Promise<Response> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  return fetch(`${config.backendApiUrl}${FILES_API_ROUTE}/${encodeURIComponent(attachmentId)}`, {
    headers: accessToken === undefined ? {} : { authorization: `${BEARER_PREFIX}${accessToken}` },
  });
};

const decodeFilename = (contentDisposition: string | null): string => {
  const encodedFilename = contentDisposition?.match(attachmentFilenamePattern)?.[1];
  return encodedFilename === undefined ? 'download' : decodeURIComponent(encodedFilename);
};

const readAttachmentDownload = async (response: Response): Promise<AttachmentDownload> => ({
  body: Array.from(new Uint8Array(await response.arrayBuffer())),
  mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
  originalFilename: decodeFilename(response.headers.get('content-disposition')),
});

export const getPageAttachmentDownload = async (attachmentId: string): Promise<AttachmentDownloadResult> => {
  if (!attachmentIdSchema.safeParse(attachmentId).success) return { error: 'invalid', ok: false };
  const response = await getAttachmentDownloadRequest(attachmentId);
  if (!response.ok) return { error: 'request', ok: false };
  return { download: await readAttachmentDownload(response), ok: true };
};
