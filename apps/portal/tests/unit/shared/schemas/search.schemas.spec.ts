import { describe, expect, it } from 'bun:test';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_CONTENT_TYPE_LENGTH,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
} from '@/shared/constants/search.constants';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';

describe('searchQuerySchema', () => {
  it('parses a well-formed query, keeping every field as given', () => {
    const result = searchQuerySchema.parse({ contentType: 'note', query: 'roadmap', sourceType: 'PAGE' });

    expect(result).toMatchObject({ contentType: 'note', query: 'roadmap', sourceType: 'PAGE' });
    expect(result.limit).toBe(SEARCH_DEFAULT_LIMIT);
  });

  it('discards an unknown sourceType instead of throwing', () => {
    const result = searchQuerySchema.parse({ query: 'QA', sourceType: 'inventado' });

    expect(result.sourceType).toBeUndefined();
    expect(result.query).toBe('QA');
  });

  it('truncates a query that is too long instead of throwing', () => {
    const tooLong = 'a'.repeat(SEARCH_MAX_QUERY_LENGTH + 50);

    const result = searchQuerySchema.parse({ query: tooLong });

    expect(result.query).toHaveLength(SEARCH_MAX_QUERY_LENGTH);
  });

  it('truncates an over-long optional text field instead of throwing', () => {
    const tooLong = 'a'.repeat(SEARCH_MAX_CONTENT_TYPE_LENGTH + 10);

    const result = searchQuerySchema.parse({ contentType: tooLong, query: '' });

    expect(result.contentType).toHaveLength(SEARCH_MAX_CONTENT_TYPE_LENGTH);
  });

  it('falls back to the default limit when limit is not a number', () => {
    const result = searchQuerySchema.parse({ limit: 'abc', query: '' });

    expect(result.limit).toBe(SEARCH_DEFAULT_LIMIT);
  });

  it('falls back to the default limit when limit is out of range', () => {
    const result = searchQuerySchema.parse({ limit: String(SEARCH_MAX_LIMIT + 100), query: '' });

    expect(result.limit).toBe(SEARCH_DEFAULT_LIMIT);
  });

  it('falls back to the default limit when limit is missing', () => {
    const result = searchQuerySchema.parse({ query: '' });

    expect(result.limit).toBe(SEARCH_DEFAULT_LIMIT);
  });

  it('never throws for a search screen visited with a garbled address', () => {
    expect(() =>
      searchQuerySchema.parse({
        contentType: 'x'.repeat(1000),
        cursor: ['a', 'b'],
        limit: 'not-a-number',
        query: 'x'.repeat(1000),
        sourceType: 'not-a-real-source',
        spaceId: 'x'.repeat(1000),
      }),
    ).not.toThrow();
  });
});
