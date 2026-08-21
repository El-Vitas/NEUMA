import { PAGE_CONTENT_SCHEMA_VERSION, type PageContent } from '@company-brain/shared';

/** What a page whose body cannot be read exports as: itself, with nothing written in it. */
export const EMPTY_EXPORTED_DOCUMENT: PageContent = {
  content: [],
  schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
  type: 'doc',
};
