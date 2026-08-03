import { describe, expect, it } from 'bun:test';
import { buildSearchApiEndpoint, mapSearchResponse, parseSearchSnippet } from '@/modules/search/lib/search.lib';
import { searchQuerySchema } from '@/modules/search/schemas/search.schemas';

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
});
