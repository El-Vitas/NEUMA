import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@neuma/shared';

export const BYTES_PER_MEGABYTE = 1024 * 1024;

export const EMPTY_EXPORTED_DOCUMENT: PageContent = {
  content: [],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};
