import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@company-brain/shared';

export const EMPTY_EXPORTED_DOCUMENT: PageContent = {
  content: [],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};
