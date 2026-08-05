import { describe, expect, it, spyOn } from 'bun:test';
import {
  buildSearchApiEndpoint,
  formatSearchResultDate,
  mapSearchResponse,
  parseSearchSnippet,
} from '@/shared/lib/search.lib';
import { searchQuerySchema } from '@/shared/schemas/search.schemas';

describe('search.lib', () => {
  it('normalizes bounded search parameters once at the URL boundary', () => {
    expect(
      searchQuerySchema.parse({
        contentType: '  guide  ',
        query: '  onboarding  ',
        tags: '  hr,security  ',
      }),
    ).toEqual({
      contentType: 'guide',
      limit: 20,
      query: 'onboarding',
      tags: ['hr', 'security'],
    });
  });

  it('builds the authenticated API endpoint with supported filters and cursor', () => {
    expect(
      buildSearchApiEndpoint({
        contentType: 'guide',
        cursor: 'next-page',
        limit: 20,
        query: 'onboarding',
        sourceType: 'PAGE',
        spaceId: 'space-1',
        tags: ['hr', 'security'],
      }),
    ).toBe(
      '/api/v1/search?contentType=guide&cursor=next-page&limit=20&query=onboarding&sourceType=PAGE&spaceId=space-1&tags=hr%2Csecurity',
    );
  });

  it('renders constrained mark snippets as safe text segments', () => {
    expect(parseSearchSnippet('<mark>Onboarding</mark> <script>alert(1)</script>')).toEqual([
      { highlighted: true, text: 'Onboarding' },
      { highlighted: false, text: ' alert(1)' },
    ]);
  });

  it('maps only the validated backend search response shape', () => {
    expect(
      mapSearchResponse({
        items: [
          {
            contentType: 'guide',
            rank: 0.9,
            spaceId: 'space-1',
            sourceId: 'page-1',
            sourceType: 'PAGE',
            snippet: '<mark>Onboarding</mark> guide',
            title: 'Onboarding',
            updatedAt: '2026-08-03T12:00:00.000Z',
          },
        ],
        nextCursor: 'next-page',
      }),
    ).toEqual({
      items: [
        {
          contentType: 'guide',
          rank: 0.9,
          spaceId: 'space-1',
          sourceId: 'page-1',
          sourceType: 'PAGE',
          snippet: [
            { highlighted: true, text: 'Onboarding' },
            { highlighted: false, text: ' guide' },
          ],
          title: 'Onboarding',
          updatedAt: '2026-08-03T12:00:00.000Z',
        },
      ],
      nextCursor: 'next-page',
    });
  });

  it('formats the result date per locale using a hoisted formatter instance', () => {
    expect(formatSearchResultDate('en', '2026-08-03T12:00:00.000Z')).toBe('Aug 3, 2026');
    expect(formatSearchResultDate('es', '2026-08-03T12:00:00.000Z')).toBe('3 ago 2026');
  });

  it('reuses the hoisted formatter instance instead of constructing a new one on each call', () => {
    const constructorSpy = spyOn(Intl, 'DateTimeFormat');

    formatSearchResultDate('en', '2026-08-03T12:00:00.000Z');
    formatSearchResultDate('en', '2026-08-04T12:00:00.000Z');
    formatSearchResultDate('es', '2026-08-05T12:00:00.000Z');

    expect(constructorSpy).not.toHaveBeenCalled();
    constructorSpy.mockRestore();
  });
});
