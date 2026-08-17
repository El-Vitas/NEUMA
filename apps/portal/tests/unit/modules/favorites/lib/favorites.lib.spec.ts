import { describe, expect, it } from 'bun:test';
import { canMoveFavoriteDown, canMoveFavoriteUp, swapFavoritePages } from '@/modules/favorites/lib/favorites.lib';
import type { FavoritePage } from '@/shared/types/favorites.types';

const buildFavorite = (pageId: string, order: number): FavoritePage => ({
  favoriteId: `favorite-${pageId}`,
  lifecycle: 'ACTIVE',
  order,
  pageId,
  spaceId: 'space-a',
  title: pageId,
});

const favorites: readonly FavoritePage[] = [
  buildFavorite('page-a', 0),
  buildFavorite('page-b', 1),
  buildFavorite('page-c', 2),
];

describe('swapFavoritePages', () => {
  it('swaps a favorite with its predecessor when moved up', () => {
    const next = swapFavoritePages(favorites, 'page-b', 'up');

    expect(next.map((favorite) => favorite.pageId)).toEqual(['page-b', 'page-a', 'page-c']);
  });

  it('swaps a favorite with its successor when moved down', () => {
    const next = swapFavoritePages(favorites, 'page-b', 'down');

    expect(next.map((favorite) => favorite.pageId)).toEqual(['page-a', 'page-c', 'page-b']);
  });

  it('leaves the list untouched when moving the first favorite up', () => {
    const next = swapFavoritePages(favorites, 'page-a', 'up');

    expect(next).toBe(favorites);
  });

  it('leaves the list untouched when moving the last favorite down', () => {
    const next = swapFavoritePages(favorites, 'page-c', 'down');

    expect(next).toBe(favorites);
  });

  it('leaves the list untouched when the page is not favorited', () => {
    const next = swapFavoritePages(favorites, 'page-unknown', 'up');

    expect(next).toBe(favorites);
  });
});

describe('canMoveFavoriteUp / canMoveFavoriteDown', () => {
  it('refuses to move the first favorite up', () => {
    expect(canMoveFavoriteUp(favorites, 'page-a')).toBe(false);
  });

  it('allows moving a middle favorite up or down', () => {
    expect(canMoveFavoriteUp(favorites, 'page-b')).toBe(true);
    expect(canMoveFavoriteDown(favorites, 'page-b')).toBe(true);
  });

  it('refuses to move the last favorite down', () => {
    expect(canMoveFavoriteDown(favorites, 'page-c')).toBe(false);
  });
});
