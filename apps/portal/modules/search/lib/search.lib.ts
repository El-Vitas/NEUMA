import { API_ROUTES, ROUTES } from '@/shared/routes/constants/routes.constants';
import { searchResponseSchema } from '../schemas/search.schemas';
import type { SearchPage, SearchQuery, SearchResult, SearchSnippetPart } from '../types/search.types';

const stripMarkup = (text: string): string => text.replace(/<[^>]*>/g, '');

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

export const buildSearchApiEndpoint = (params: SearchQuery): string => {
  return `${API_ROUTES.SEARCH}?${buildSearchQueryString(params, true)}`;
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

export const mapSearchResponse = (response: unknown): SearchPage => {
  const parsed = searchResponseSchema.parse(response);
  const items: readonly SearchResult[] = parsed.items.map((item) => ({
    ...item,
    snippet: parseSearchSnippet(item.snippet),
  }));
  return { items, ...(parsed.nextCursor === undefined ? {} : { nextCursor: parsed.nextCursor }) };
};
