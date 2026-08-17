import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { AnchorHTMLAttributes } from 'react';
import type { FavoritePage } from '@/shared/types/favorites.types';
import en from '../../../../../messages/en.json';

let hookState: {
  favorites: readonly FavoritePage[];
  moveFavorite: (pageId: string, direction: 'down' | 'up') => Promise<boolean>;
  removeFavorite: (pageId: string) => Promise<boolean>;
};

const moveFavorite = mock(async () => true);
const removeFavorite = mock(async () => true);

mock.module('@/modules/favorites/hooks/use.favorites', () => ({
  useFavorites: () => hookState,
}));

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { FavoritesSection } = await import('@/modules/favorites/components/favorites.section');

const handbook: FavoritePage = {
  favoriteId: 'favorite-a',
  lifecycle: 'ACTIVE',
  order: 0,
  pageId: 'page-a',
  spaceId: 'space-a',
  title: 'Handbook',
};

const roadmap: FavoritePage = {
  favoriteId: 'favorite-b',
  lifecycle: 'ACTIVE',
  order: 1,
  pageId: 'page-b',
  spaceId: 'space-a',
  title: 'Roadmap',
};

const renderSection = (favorites: readonly FavoritePage[]) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FavoritesSection favorites={favorites} />
    </NextIntlClientProvider>,
  );

describe('FavoritesSection', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('shows an empty state when there are no favorites yet', () => {
    hookState = { favorites: [], moveFavorite, removeFavorite };
    renderSection([]);

    expect(screen.getByText('You have no favorite pages')).toBeDefined();
  });

  it('lists favorite pages as links to their page', () => {
    hookState = { favorites: [handbook, roadmap], moveFavorite, removeFavorite };
    renderSection([handbook, roadmap]);

    expect(screen.getByRole('link', { name: 'Handbook' }).getAttribute('href')).toBe('/spaces/space-a/pages/page-a');
    expect(screen.getByRole('link', { name: 'Roadmap' }).getAttribute('href')).toBe('/spaces/space-a/pages/page-b');
  });

  it('disables moving the first favorite up and the last favorite down', () => {
    hookState = { favorites: [handbook, roadmap], moveFavorite, removeFavorite };
    renderSection([handbook, roadmap]);

    expect(screen.getByRole('button', { name: 'Move Handbook up one place' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move Roadmap down one place' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Move Handbook down one place' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Move Roadmap up one place' }).hasAttribute('disabled')).toBe(false);
  });

  it('asks to move a favorite when its button is pressed', async () => {
    hookState = { favorites: [handbook, roadmap], moveFavorite, removeFavorite };
    renderSection([handbook, roadmap]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Roadmap up one place' }));

    await waitFor(() => {
      expect(moveFavorite).toHaveBeenCalledWith('page-b', 'up');
    });
  });

  it('asks to remove a favorite when its remove button is pressed', async () => {
    hookState = { favorites: [handbook], moveFavorite, removeFavorite };
    renderSection([handbook]);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Handbook from favorites' }));

    await waitFor(() => {
      expect(removeFavorite).toHaveBeenCalledWith('page-a');
    });
  });
});
