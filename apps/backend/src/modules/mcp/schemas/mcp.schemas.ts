import { PAGE_LIFECYCLE_VALUES, pageContentSchema, SPACE_VISIBILITY_VALUES } from '@company-brain/shared';
import { z } from 'zod';

import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CONTENT_TYPE_LENGTH,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MAX_TAG_LENGTH,
  SEARCH_MAX_TAGS,
  SEARCH_SOURCE_TYPE_VALUES,
} from '../../../common/constants/search.constants';

const mcpSpaceSchema = z.object({
  id: z.string().max(128),
  name: z.string().max(200),
  slug: z.string().max(200),
  visibility: z.enum(SPACE_VISIBILITY_VALUES),
});

const mcpPageSchema = z.object({
  content: pageContentSchema,
  id: z.string().max(128),
  lifecycle: z.enum(PAGE_LIFECYCLE_VALUES),
  order: z.number().int().nonnegative(),
  parentId: z.string().max(128).nullable(),
  spaceId: z.string().max(128),
  title: z.string().max(200),
  version: z.number().int().positive(),
});

export const getPageInputSchema = z.object({
  pageId: z.uuid(),
});

export const getPageOutputSchema = z.object({
  page: mcpPageSchema,
});

export const listSpacesInputSchema = z.object({});

export const listSpacesOutputSchema = z.object({
  spaces: z.array(mcpSpaceSchema).max(1000),
});

const searchSourceTypeSchema = z.enum(SEARCH_SOURCE_TYPE_VALUES);

const mcpSearchResultSchema = z.object({
  contentType: z.string().max(SEARCH_MAX_CONTENT_TYPE_LENGTH),
  rank: z.number(),
  spaceId: z.string().max(128),
  sourceId: z.string().max(128),
  sourceType: searchSourceTypeSchema,
  snippet: z.string().max(10_000),
  title: z.string().max(200),
  updatedAt: z.iso.datetime(),
});

export const searchCompanyBrainInputSchema = z.object({
  contentType: z.string().trim().min(1).max(SEARCH_MAX_CONTENT_TYPE_LENGTH).optional(),
  cursor: z.string().trim().min(1).max(SEARCH_MAX_CURSOR_LENGTH).optional(),
  limit: z.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
  query: z.string().trim().min(1).max(SEARCH_MAX_QUERY_LENGTH),
  sourceType: searchSourceTypeSchema.optional(),
  spaceId: z.string().trim().min(1).max(128).optional(),
  tags: z.array(z.string().trim().min(1).max(SEARCH_MAX_TAG_LENGTH)).max(SEARCH_MAX_TAGS).optional(),
});

export const searchCompanyBrainOutputSchema = z.object({
  items: z.array(mcpSearchResultSchema).max(SEARCH_MAX_LIMIT),
  nextCursor: z.string().max(SEARCH_MAX_CURSOR_LENGTH).optional(),
});
