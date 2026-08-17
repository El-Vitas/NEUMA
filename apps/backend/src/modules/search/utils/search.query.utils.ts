import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CONTENT_TYPE_LENGTH,
  SEARCH_MAX_CURSOR_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MAX_TAG_LENGTH,
  SEARCH_MAX_TAGS,
} from '../../../common/constants/search.constants';
import { SEARCH_EDITED_RANGE_VALUES, SEARCH_MAX_AUTHOR_QUERY_LENGTH } from '../constants/search.constants';
import type { SearchEditedRange, SearchQueryParams, SearchQueryWithFilters } from '../types/search.types';

const normalizeOptionalText = (value: string | undefined, maxLength: number): string | undefined => {
  if (value === undefined) return;
  const normalized = value.trim();
  return normalized === '' ? undefined : normalized.slice(0, maxLength);
};

const normalizeTags = (value: string | undefined): readonly string[] | undefined => {
  if (value === undefined) return;
  const tags = value
    .split(',')
    .map((tag) => tag.trim().slice(0, SEARCH_MAX_TAG_LENGTH))
    .filter((tag) => tag.length > 0)
    .slice(0, SEARCH_MAX_TAGS);
  return tags.length === 0 ? undefined : tags;
};

const normalizeLimit = (value: number | string | undefined): number => {
  const parsed = typeof value === 'number' ? value : Number(value ?? SEARCH_DEFAULT_LIMIT);
  if (!Number.isInteger(parsed) || parsed < 1) return SEARCH_DEFAULT_LIMIT;
  return Math.min(parsed, SEARCH_MAX_LIMIT);
};

const normalizeEditedRange = (value: string | undefined): SearchEditedRange | undefined =>
  SEARCH_EDITED_RANGE_VALUES.find((candidate) => candidate === value);

export const normalizeSearchQuery = (
  params: SearchQueryParams,
): Omit<SearchQueryWithFilters, 'userId' | 'userRole' | 'workspaceId'> => {
  const normalizedQuery = (params.query ?? '').trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
  const authorQuery = normalizeOptionalText(params.authorQuery, SEARCH_MAX_AUTHOR_QUERY_LENGTH);
  const contentType = normalizeOptionalText(params.contentType, SEARCH_MAX_CONTENT_TYPE_LENGTH);
  const cursor = normalizeOptionalText(params.cursor, SEARCH_MAX_CURSOR_LENGTH);
  const editedRange = normalizeEditedRange(params.editedRange);
  const spaceId = normalizeOptionalText(params.spaceId, 128);
  const tags = normalizeTags(params.tags);
  return {
    ...(authorQuery === undefined ? {} : { authorQuery }),
    ...(contentType === undefined ? {} : { contentType }),
    ...(cursor === undefined ? {} : { cursor }),
    ...(editedRange === undefined ? {} : { editedRange }),
    limit: normalizeLimit(params.limit),
    query: normalizedQuery,
    ...(params.sourceType === undefined ? {} : { sourceType: params.sourceType }),
    ...(spaceId === undefined ? {} : { spaceId }),
    ...(tags === undefined ? {} : { tags }),
  };
};
