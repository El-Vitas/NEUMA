export const FILES_API_ROUTE = '/api/v1/files';
export const PAGE_ASSET_URL_PREFIX = '/api/page-assets';
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

export const ATTACHMENT_MIME_TYPE_SET: ReadonlySet<string> = new Set<string>(ATTACHMENT_MIME_TYPES);

/** Matches the RFC 5987 percent-encoded name in `content-disposition`. */
export const ATTACHMENT_FILENAME_PATTERN = /filename\*=UTF-8''([^;]+)/iu;

export const ATTACHMENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  'application/pdf': 'PDF',
  'application/zip': 'ZIP',
  'audio/mpeg': 'MP3',
  'audio/ogg': 'OGG',
  'audio/wav': 'WAV',
  'image/gif': 'GIF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'text/plain': 'TXT',
  'video/mp4': 'MP4',
  'video/webm': 'WEBM',
};

export const ATTACHMENT_SIZE_UNITS = [
  { threshold: 1024 ** 2, unit: 'megabyte' },
  { threshold: 1024, unit: 'kilobyte' },
] as const;

/** Backend headers forwarded to the browser; the range ones keep audio and video seekable. */
export const PAGE_ASSET_PASSED_HEADERS: readonly string[] = [
  'accept-ranges',
  'content-disposition',
  'content-length',
  'content-range',
  'content-type',
];
