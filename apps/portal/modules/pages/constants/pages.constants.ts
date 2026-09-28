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

/**
 * The empty values a page's parts fall back to.
 *
 * They are named once and shared because a fresh `[]` or `{}` written at each
 * call is a different value every render, and everything downstream redraws
 * for a change that never happened.
 */
export const EMPTY_PAGE_PERSON_OPTIONS: readonly PagePersonOption[] = [];

export const EMPTY_PAGE_SUMMARIES: readonly PageSummary[] = [];

export const EMPTY_PAGE_HEADINGS: readonly PageEditorHeading[] = [];

export const EMPTY_PAGE_EMBEDDED_COLLECTIONS: Readonly<Record<string, ReactNode>> = {};

export const EMPTY_PAGE_INFO: PageInfoMetadata = {
  createdAt: null,
  createdByName: null,
  lastEditedAt: null,
  lastEditedByName: null,
};

/** What splits a page's own writing into the words its word count reads off. */
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
  /** Lo que dice la página, escrito a través de su documento en vivo. */
  content: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/content`,
  /** Bloques agregados al final de la página, a través de su documento en vivo. */
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
  /** Renombrar o quitar una opción, que es renombrar o quitar una columna del tablero, arrastrando las filas. */
  rewriteOption: (spaceId: string, pageId: string, propertyKey: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/schema/properties/${propertyKey}/rewrite-option`,
  /** Lo que una vista dice de sí misma, sin rehacer la forma de la colección. */
  viewConfiguration: (spaceId: string, pageId: string, viewName: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/schema/views/${encodeURIComponent(viewName)}/configuration`,
  rows: (spaceId: string, pageId: string) => `/api/v1/spaces/${spaceId}/pages/${pageId}/rows`,
  view: (spaceId: string, pageId: string, viewName: string) =>
    `/api/v1/spaces/${spaceId}/pages/${pageId}/views/${encodeURIComponent(viewName)}`,
} as const;

/** Lo que se dice cuando la lista de páginas no llegó siquiera como una lista. */
export const PAGES_LIST_IS_NOT_A_LIST = 'The pages list arrived as something that is not a list';
