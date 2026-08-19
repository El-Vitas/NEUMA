import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from 'sonner';
import type { FavoritePage } from '@/shared/types/favorites.types';
import en from '../../../../../messages/en.json';

interface FavoriteMutationInput {
  readonly pageId: string;
}

type AddFavoriteResult = { readonly data: FavoritePage } | { readonly serverError: string };
type RemoveFavoriteResult = { readonly data: undefined } | { readonly serverError: string };

const addFavorite = mock(
  async (_input: FavoriteMutationInput): Promise<AddFavoriteResult> => ({
    data: {
      favoriteId: 'favorite-a',
      lifecycle: 'ACTIVE',
      order: 0,
      pageId: 'page-a',
      spaceId: 'space-a',
      title: 'Handbook',
    },
  }),
);
const removeFavorite = mock(
  async (_input: FavoriteMutationInput): Promise<RemoveFavoriteResult> => ({ data: undefined }),
);
const refreshRouter = mock(() => undefined);

mock.module('@/modules/favorites/server/actions/favorites.actions', () => ({
  addFavoriteAction: (input: FavoriteMutationInput) => addFavorite(input),
  removeFavoriteAction: (input: FavoriteMutationInput) => removeFavorite(input),
}));

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshRouter }),
}));

const { PageFavoriteToggle } = await import('@/shared/components/portal/page-favorite-toggle');

const toggleTree = (isFavorite: boolean) => (
  <>
    <Toaster />
    <NextIntlClientProvider locale="en" messages={en}>
      <PageFavoriteToggle isFavorite={isFavorite} pageId="page-a" spaceId="space-a" title="Handbook" />
    </NextIntlClientProvider>
  </>
);

const renderToggle = (isFavorite: boolean) => render(toggleTree(isFavorite));

describe('PageFavoriteToggle', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('offers to add a page that is not yet a favorite', () => {
    renderToggle(false);

    const button = screen.getByRole('button', { name: 'Add Handbook to favorites' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('adds the page and flips to the remove label once the action succeeds', async () => {
    renderToggle(false);

    fireEvent.click(screen.getByRole('button', { name: 'Add Handbook to favorites' }));

    await waitFor(() => {
      expect(addFavorite).toHaveBeenCalledWith({ pageId: 'page-a' });
      expect(screen.getByRole('button', { name: 'Remove Handbook from favorites' })).toBeDefined();
    });
    expect(refreshRouter).toHaveBeenCalledTimes(1);
  });

  it('reverts the optimistic state when the action fails, without refreshing', async () => {
    addFavorite.mockImplementationOnce(async () => ({ serverError: 'unexpected' }));
    renderToggle(false);

    fireEvent.click(screen.getByRole('button', { name: 'Add Handbook to favorites' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Handbook to favorites' })).toBeDefined();
    });
    expect(refreshRouter).not.toHaveBeenCalled();
  });

  it('follows the server when the page stops being a favorite somewhere else', () => {
    const { rerender } = renderToggle(true);

    rerender(toggleTree(false));

    expect(screen.getByRole('button', { name: 'Add Handbook to favorites' })).toBeDefined();
  });

  it('removes an already-favorited page', async () => {
    renderToggle(true);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Handbook from favorites' }));

    await waitFor(() => {
      expect(removeFavorite).toHaveBeenCalledWith({ pageId: 'page-a' });
      expect(screen.getByRole('button', { name: 'Add Handbook to favorites' })).toBeDefined();
    });
  });
});
