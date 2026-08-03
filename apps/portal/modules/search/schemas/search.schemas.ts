import { z } from 'zod';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CONTENT_TYPE_LENGTH,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MAX_SPACE_ID_LENGTH,
  SEARCH_MAX_TAG_LENGTH,
  SEARCH_MAX_TAGS,
  SEARCH_SOURCE_TYPES,
} from '../constants/search.constants';

const firstQueryValue = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

const optionalText = (maxLength: number) =>
  z
    .preprocess(firstQueryValue, z.string().trim().max(maxLength).optional())
    .transform((value) => (value === '' ? undefined : value))
    .optional();

const tagsSchema = z
  .preprocess(firstQueryValue, z.string().trim().optional())
  .transform((value) =>
    value === undefined || value === ''
      ? undefined
      : value
          .split(',')
          .map((tag) => tag.trim().slice(0, SEARCH_MAX_TAG_LENGTH))
          .filter((tag) => tag.length > 0)
          .slice(0, SEARCH_MAX_TAGS),
  )
  .optional();

export const searchQuerySchema = z.object({
  contentType: optionalText(SEARCH_MAX_CONTENT_TYPE_LENGTH),
  cursor: optionalText(SEARCH_MAX_CURSOR_LENGTH),
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT),
  query: z
    .preprocess(firstQueryValue, z.string().trim().max(SEARCH_MAX_QUERY_LENGTH).default(''))
    .transform((value) => value),
  sourceType: z.preprocess(firstQueryValue, z.enum(SEARCH_SOURCE_TYPES).optional()),
  spaceId: optionalText(SEARCH_MAX_SPACE_ID_LENGTH),
  tags: tagsSchema,
});

export const searchResponseSchema = z.object({
  items: z.array(
    z.object({
      contentType: z.string(),
      rank: z.number(),
      spaceId: z.string(),
      sourceId: z.string(),
      sourceType: z.enum(SEARCH_SOURCE_TYPES),
      snippet: z.string(),
      title: z.string(),
      updatedAt: z.string(),
    }),
  ),
  nextCursor: z.string().optional(),
});
