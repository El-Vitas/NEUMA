import { describe, expect, test } from 'bun:test';
import { normalizeSearchQuery } from '@/modules/search/utils/search.query.utils';

describe('normalizeSearchQuery', () => {
  test('normalizes bounded filters and trims query text', () => {
    const result = normalizeSearchQuery({
      contentType: ' PAGE ',
      limit: '25',
      query: '  roadmap  ',
      sourceType: 'PAGE',
      spaceId: 'space-1',
      tags: 'planning, roadmap',
    });

    expect(result).toEqual({
      contentType: 'PAGE',
      limit: 25,
      query: 'roadmap',
      sourceType: 'PAGE',
      spaceId: 'space-1',
      tags: ['planning', 'roadmap'],
    });
  });

  test('normalizes an empty query without creating a database search', () => {
    expect(normalizeSearchQuery({ query: '   ' })).toEqual({ query: '', limit: 20 });
  });

  test('preserves a cursor as an opaque pagination token', () => {
    expect(normalizeSearchQuery({ cursor: 'eyJvZmZzZXQiOjEwfQ==', query: 'área' })).toEqual({
      cursor: 'eyJvZmZzZXQiOjEwfQ==',
      limit: 20,
      query: 'área',
    });
  });
});
