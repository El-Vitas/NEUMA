export const FILES_API_ROUTE = '/api/v1/files';
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const IMAGE_ATTACHMENT_MIME_TYPE_PREFIX = 'image/';
export const PAGE_ATTACHMENTS_CACHE_TAG = 'page-attachments';
export const PAGE_ATTACHMENTS_API_ROUTE = (pageId: string): string => `${FILES_API_ROUTE}/page/${pageId}`;
export const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const;
