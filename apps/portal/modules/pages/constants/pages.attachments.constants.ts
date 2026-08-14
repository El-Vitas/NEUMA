export const FILES_API_ROUTE = '/api/v1/files';
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const IMAGE_ATTACHMENT_MIME_TYPE_PREFIX = 'image/';
export const VIDEO_ATTACHMENT_MIME_TYPE_PREFIX = 'video/';
export const AUDIO_ATTACHMENT_MIME_TYPE_PREFIX = 'audio/';
export const PAGE_ATTACHMENTS_CACHE_TAG = 'page-attachments';
export const PAGE_ATTACHMENTS_API_ROUTE = (pageId: string): string => `${FILES_API_ROUTE}/page/${pageId}`;
export const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'video/mp4',
  'video/webm',
] as const;

/**
 * What travels back with a file: what it is, what it is called, and — for
 * something that plays — which stretch of it this is and how long the whole is.
 */
export const PAGE_ASSET_PASSED_HEADERS: readonly string[] = [
  'accept-ranges',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
];
