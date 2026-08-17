import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { RecentPageEntry } from '@/shared/types/recents.types';
import en from '../../../../../messages/en.json';

interface UseRecentPagesStub {
  readonly hasLoaded: boolean;
  readonly recentPages: readonly RecentPageEntry[];
}

const useRecentPages = mock((): UseRecentPagesStub => ({ hasLoaded: false, recentPages: [] }));

mock.module('@/shared/hooks/use.recents-storage.hook', () => ({
  useRecentPages: () => useRecentPages(),
}));

const { RecentPagesList } = await import('@/shared/components/portal/recents-list');

const renderList = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <RecentPagesList />
    </NextIntlClientProvider>,
  );

describe('RecentPagesList', () => {
  it('renders nothing before the stored list has been read', () => {
    useRecentPages.mockImplementation(() => ({ hasLoaded: false, recentPages: [] }));
    const { container } = renderList();

    expect(container.textContent).toBe('');
  });

  it('shows an empty message once loaded with nothing recorded', () => {
    useRecentPages.mockImplementation(() => ({ hasLoaded: true, recentPages: [] }));
    renderList();

    expect(screen.getByText('You have not viewed any pages yet')).toBeDefined();
  });

  it('lists each recently visited page with a link to it and its space', () => {
    useRecentPages.mockImplementation(() => ({
      hasLoaded: true,
      recentPages: [{ pageId: 'page-1', spaceId: 'space-1', spaceName: 'Engineering', title: 'Roadmap', visitedAt: 1 }],
    }));
    renderList();

    const link = screen.getByRole('link', { name: /Roadmap/ });
    expect(link.getAttribute('href')).toBe('/spaces/space-1/pages/page-1');
    expect(screen.getByText('In Engineering')).toBeDefined();
  });
});
