import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SearchResults } from '@/modules/search/components/search.results';
import type { SearchPage, SearchQuery } from '@/shared/types/search.types';
import en from '../../../../../messages/en.json';

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const params: SearchQuery = {
  limit: 20,
  query: 'onboarding',
};

const renderResults = (page: SearchPage | null) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SearchResults locale="en" page={page} params={params} />
    </NextIntlClientProvider>,
  );

describe('SearchResults', () => {
  it('shows a recoverable error state', () => {
    renderResults(null);
    expect(screen.getByText('Could not load search results. Check your connection and try again.')).toBeDefined();
  });

  it('shows a useful empty state', () => {
    renderResults({ items: [] });
    expect(screen.getByText('No results found')).toBeDefined();
    expect(screen.getByText('Try a different query or remove a filter.')).toBeDefined();
  });

  it('links pages to stable portal destinations and exposes the next cursor', () => {
    renderResults({
      items: [
        {
          contentType: 'guide',
          rank: 0.8,
          snippet: [{ highlighted: true, text: 'Onboarding' }],
          sourceId: 'page-1',
          sourceType: 'PAGE',
          spaceId: 'space-1',
          title: 'Onboarding page',
          updatedAt: '2026-08-03T12:00:00.000Z',
        },
      ],
      nextCursor: 'next-page',
    });

    expect(screen.getByRole('link', { name: 'Onboarding page' }).getAttribute('href')).toBe(
      '/spaces/space-1/pages/page-1',
    );
    expect(screen.getByRole('link', { name: 'Load more results' }).getAttribute('href')).toBe(
      '/search?cursor=next-page&query=onboarding',
    );
  });

  it('draws a word that answers twice in the same line, both times, without confusing one for the other', () => {
    const complaints: string[] = [];
    const spoke = console.error;
    console.error = (...said: readonly unknown[]) => complaints.push(said.map(String).join(' '));

    renderResults({
      items: [
        {
          contentType: 'guide',
          rank: 0.8,
          snippet: [
            { highlighted: true, text: 'hormiga' },
            { highlighted: false, text: ' sube, la ' },
            { highlighted: true, text: 'hormiga' },
            { highlighted: false, text: ' baja' },
          ],
          sourceId: 'page-1',
          sourceType: 'PAGE',
          spaceId: 'space-1',
          title: 'Las hormigas',
          updatedAt: '2026-08-03T12:00:00.000Z',
        },
      ],
    });

    console.error = spoke;
    expect(screen.getAllByText('hormiga')).toHaveLength(2);
    expect(complaints).toEqual([]);
  });

  it('announces only the result count as a status update', () => {
    renderResults({ items: [] });

    expect(screen.getByRole('status').textContent).toBe('Showing 0 results');
  });
});
