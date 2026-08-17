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

  test('normalizes an author query and a known edited range', () => {
    expect(normalizeSearchQuery({ authorQuery: '  Ada  ', editedRange: 'LAST_SEVEN_DAYS', query: 'roadmap' })).toEqual({
      authorQuery: 'Ada',
      editedRange: 'LAST_SEVEN_DAYS',
      limit: 20,
      query: 'roadmap',
    });
  });

  test('drops an edited range that is not one of the known presets', () => {
    expect(normalizeSearchQuery({ editedRange: 'yesterday', query: 'roadmap' })).toEqual({
      limit: 20,
      query: 'roadmap',
    });
  });

  test('drops an author query made only of whitespace', () => {
    expect(normalizeSearchQuery({ authorQuery: '   ', query: 'roadmap' })).toEqual({
      limit: 20,
      query: 'roadmap',
    });
  });
});
