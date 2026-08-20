import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { SearchResultCard } from '@/modules/search/components/search.result';
import type { SearchResult } from '@/shared/types/search.types';
import en from '../../../../../messages/en.json';

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

const baseResult: SearchResult = {
  contentType: 'PAGE',
  icon: null,
  parentPageId: null,
  parentPageTitle: null,
  rank: 0.8,
  snippet: [{ highlighted: true, text: 'Onboarding' }],
  sourceId: 'page-1',
  sourceType: 'PAGE',
  spaceId: 'space-1',
  spaceName: null,
  title: 'Onboarding page',
  updatedAt: '2026-08-03T12:00:00.000Z',
};

const renderResult = (result: SearchResult) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SearchResultCard locale="en" result={result} />
    </NextIntlClientProvider>,
  );

describe('SearchResultCard', () => {
  it('shows the space name instead of the raw space identifier', () => {
    renderResult({ ...baseResult, spaceName: 'Engineering' });

    expect(screen.getByText('In Engineering')).toBeDefined();
    expect(screen.queryByText('space-1')).toBeNull();
  });

  it('shows the parent page when the result belongs to one', () => {
    renderResult({ ...baseResult, parentPageId: 'page-0', parentPageTitle: 'Guides', spaceName: 'Engineering' });

    expect(screen.getByText('In Guides')).toBeDefined();
  });

  it('shows that a result sits at the space root when it has no parent page', () => {
    renderResult({ ...baseResult, parentPageId: null, spaceName: 'Engineering' });

    expect(screen.getByText('At the space root')).toBeDefined();
  });

  it('shows neither space nor parent context for a result not yet reindexed with it', () => {
    renderResult(baseResult);

    expect(screen.queryByText(/^In /)).toBeNull();
    expect(screen.queryByText('At the space root')).toBeNull();
  });

  it('does not leak the raw content type value next to the translated source type badge', () => {
    renderResult(baseResult);

    expect(screen.getByText('Page')).toBeDefined();
    expect(screen.queryByText('PAGE')).toBeNull();
  });

  it('wears the page own mark when it chose one', () => {
    renderResult({ ...baseResult, icon: { kind: 'emoji', value: '🚀' }, spaceName: 'Engineering' });

    expect(screen.getByText('🚀')).toBeDefined();
  });
});
