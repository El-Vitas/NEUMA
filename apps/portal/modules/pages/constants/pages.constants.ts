import type { ReactNode } from 'react';
import type { AttachmentSummary } from '../attachments/types/pages.attachments.types';
import type { PagePersonOption } from '../collections/types/pages.schema.types';
import type { PageEditorHeading } from '../editor/structure/types/pages.editor.contents.types';
import type { PageBacklinksResult } from '../links/types/pages.backlinks.types';
import type { PageInfoMetadata } from '../trust/types/pages.info.types';
import type { PageSummary } from '../types/pages.types';

export const PAGE_BACKLINKS_CACHE_TAG = (pageId: string): string => `page-backlinks:${pageId}`;

export const PAGE_LOCATION_CACHE_TAG = (pageId: string): string => `page-location:${pageId}`;

export const PAGES_ASSIGNED_CACHE_TAG = 'pages-assigned';

export const EMPTY_PAGE_BACKLINKS: PageBacklinksResult = { count: 0, items: [] };

export const EMPTY_PAGE_ATTACHMENTS: readonly AttachmentSummary[] = [];

/** Shared constants: a fresh `[]` or `{}` per call is a new value every render and redraws everything downstream. */
export const EMPTY_PAGE_PERSON_OPTIONS: readonly PagePersonOption[] = [];

export const EMPTY_PAGE_SUMMARIES: readonly PageSummary[] = [];

export const EMPTY_RESTRICTED_BLOCK_IDS: ReadonlySet<string> = new Set();

export const EMPTY_PAGE_HEADINGS: readonly PageEditorHeading[] = [];

export const EMPTY_PAGE_EMBEDDED_COLLECTIONS: Readonly<Record<string, ReactNode>> = {};

export const EMPTY_PAGE_INFO: PageInfoMetadata = {
  createdAt: null,
  createdByName: null,
  lastEditedAt: null,
  lastEditedByName: null,
};

export const PAGE_INFO_WORD_SEPARATOR = /\s+/;

export const PAGE_PROPERTIES_VISIBLE_LIMIT = 5;

/** Radix refuses an empty `SelectItem` value, so clearing a person field needs a stand-in for "nobody". */
export const PAGE_PERSON_FIELD_CLEAR_VALUE = '__none__';

export const PAGE_PROPERTY_COMPACT_INPUT_CLASS_NAME =
  'h-11 rounded-none border-transparent bg-transparent px-2 shadow-none hover:border-border dark:bg-transparent';

export const PAGE_API_ROUTES = {
  list: (spaceId: string, includeTrashed = false) =>
    `/api/v1/spaces/${spaceId}/pages?includeTrashed=${String(includeTrashed)}`,
  item: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}`,
  blocks: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/blocks`,
  exportMarkdown: (spaceId: string, query: string) => `/api/v1/spaces/${spaceId}/pages/export/markdown?${query}`,
  duplicate: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/duplicate`,
  lock: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/lock`,
  move: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/move`,
  order: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/order`,
  owner: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/owner`,
  properties: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/properties`,
  verification: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/verification`,
  assigned: '/api/v1/pages/assigned',
  moveDestinations: (pageId: string) => `/api/v1/pages/move-destinations/${pageId}`,
  location: (pageId: string) => `/api/v1/pages/location/${pageId}`,
  title: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/title`,
  trash: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/trash`,
  restore: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/restore`,
  backlinks: (pageId: string) => `/api/v1/pages/${pageId}/backlinks`,
  schema: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/schema`,
  rewriteOption: (spaceId: string, pageId: string, propertyKey: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/schema/properties/${propertyKey}/rewrite-option`,
  transactions: '/api/v1/transactions',
  collections: (spaceId: string) => `/api/v1/spaces/${spaceId}/collections`,
  query: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/query`,
  viewOperations: (spaceId: string, pageId: string, viewId: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/views/${encodeURIComponent(viewId)}/operations`,
  moveRow: (spaceId: string, pageId: string, viewId: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/views/${encodeURIComponent(viewId)}/move-row`,
} as const;

export const PAGES_LIST_IS_NOT_A_LIST = 'The pages list arrived as something that is not a list';
