import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import { SEARCH_RESULT_DATE_FORMATTER_EN, SEARCH_RESULT_DATE_FORMATTER_ES } from '../constants/search.constants';
import { searchResponseSchema } from '../schemas/search.schemas';
import type { SearchPage, SearchQuery, SearchResult, SearchSnippetPart } from '../types/search.types';

/**
 * Drops the tags a snippet still carries, keeping the text between them.
 *
 * It walks the snippet instead of matching a pattern: a pattern for a tag
 * restarts at every `<`, so a snippet made of nothing but `<` would keep the
 * server busy for as long as whoever wrote the page cared to make it.
 */
const stripMarkup = (text: string): string => {
  let stripped = '';
  let cursor = 0;

  while (cursor < text.length) {
    const tagStart = text.indexOf('<', cursor);
    const tagEnd = tagStart === -1 ? -1 : text.indexOf('>', tagStart);
    if (tagEnd === -1) return stripped + text.slice(cursor);
    stripped += text.slice(cursor, tagStart);
    cursor = tagEnd + 1;
  }

  return stripped;
};

export const parseSearchSnippet = (snippet: string): readonly SearchSnippetPart[] => {
  const parts: SearchSnippetPart[] = [];
  const markPattern = /<mark>([\s\S]*?)<\/mark>/gi;
  let cursor = 0;

  for (const match of snippet.matchAll(markPattern)) {
    const start = match.index ?? 0;
    const markedText = match[1] ?? '';
    const plainText = snippet.slice(cursor, start);
    if (plainText !== '') parts.push({ highlighted: false, text: stripMarkup(plainText) });
    if (markedText !== '') parts.push({ highlighted: true, text: stripMarkup(markedText) });
    cursor = start + match[0].length;
  }

  const trailingText = stripMarkup(snippet.slice(cursor));
  if (trailingText !== '') parts.push({ highlighted: false, text: trailingText });
  return parts;
};

export const appendSearchExtraParams = (url: string, extraParams: Readonly<Record<string, string>> = {}): string => {
  const suffix = new URLSearchParams(extraParams).toString();
  if (suffix === '') return url;
  return `${url}${url.includes('?') ? '&' : '?'}${suffix}`;
};

export const buildSearchApiEndpoint = (
  params: SearchQuery,
  extraParams: Readonly<Record<string, string>> = {},
): string => {
  return appendSearchExtraParams(`${API_ROUTES.SEARCH}?${buildSearchQueryString(params, true)}`, extraParams);
};

export const buildSearchPageUrl = (params: SearchQuery): string => {
  const suffix = buildSearchQueryString(params, false);
  return suffix === '' ? ROUTES.PORTAL_SEARCH : `${ROUTES.PORTAL_SEARCH}?${suffix}`;
};

const buildSearchQueryString = (params: SearchQuery, includeDefaultLimit: boolean): string => {
  const query = new URLSearchParams();
  if (params.contentType !== undefined) query.set('contentType', params.contentType);
  if (params.cursor !== undefined) query.set('cursor', params.cursor);
  if (includeDefaultLimit || params.limit !== 20) query.set('limit', String(params.limit));
  if (params.query !== '') query.set('query', params.query);
  if (params.sourceType !== undefined) query.set('sourceType', params.sourceType);
  if (params.spaceId !== undefined) query.set('spaceId', params.spaceId);
  if (params.tags !== undefined) query.set('tags', params.tags.join(','));
  return query.toString();
};

export const formatSearchResultDate = (locale: string, updatedAt: string): string => {
  const formatter = locale === 'es' ? SEARCH_RESULT_DATE_FORMATTER_ES : SEARCH_RESULT_DATE_FORMATTER_EN;
  return formatter.format(new Date(updatedAt));
};

export const mapSearchResponse = (response: unknown): SearchPage => {
  const parsed = searchResponseSchema.parse(response);
  const items: readonly SearchResult[] = parsed.items.map((item) => ({
    ...item,
    snippet: parseSearchSnippet(item.snippet),
  }));
  return { items, ...(parsed.nextCursor === undefined ? {} : { nextCursor: parsed.nextCursor }) };
};
