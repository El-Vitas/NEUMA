import { describe, expect, it } from 'bun:test';
import {
  buildPageMoveDestinations,
  describeCurrentPageMoveDestination,
} from '@/modules/pages/navigation/lib/pages.move.lib';
import type { PageMoveDestinations } from '@/modules/pages/navigation/types/pages.move.types';

const destinations: PageMoveDestinations = {
  pages: [
    { id: 'page-1', spaceId: 'space-a', title: 'Notes' },
    { id: 'page-2', spaceId: 'space-b', title: '   ' },
  ],
  parentTitle: 'Handbook',
  spaces: [
    { id: 'space-a', name: 'Alpha' },
    { id: 'space-b', name: 'Beta' },
    { id: 'space-c', name: 'Gamma' },
  ],
};

describe('buildPageMoveDestinations', () => {
  it('puts the root of each space before its pages while nothing is typed', () => {
    const choices = buildPageMoveDestinations(destinations, '', 'Space root', 'Untitled');

    expect(choices.map((choice) => choice.id)).toEqual([
      'space:space-a',
      'page-1',
      'space:space-b',
      'page-2',
      'space:space-c',
    ]);
    expect(choices.find((choice) => choice.id === 'page-2')?.title).toBe('Untitled');
  });

  it('offers only what the search found once something is typed, not the roots', () => {
    const choices = buildPageMoveDestinations(destinations, 'no', 'Space root', 'Untitled');

    expect(choices.map((choice) => choice.id)).toEqual(['page-1', 'page-2']);
  });
});

describe('describeCurrentPageMoveDestination', () => {
  it('is the root of the space when the page hangs from nothing', () => {
    const current = describeCurrentPageMoveDestination(destinations, 'space-a', null, 'Space root', 'Untitled');

    expect(current).toMatchObject({ id: 'space:space-a', pageId: null, spaceName: 'Alpha', title: 'Space root' });
  });

  it('is the page it hangs from, named as the server said', () => {
    const current = describeCurrentPageMoveDestination(destinations, 'space-a', 'page-p', 'Space root', 'Untitled');

    expect(current).toMatchObject({ id: 'page-p', pageId: 'page-p', spaceName: 'Alpha', title: 'Handbook' });
  });

  it('is nothing until the spaces are known', () => {
    const current = describeCurrentPageMoveDestination(
      { pages: [], parentTitle: null, spaces: [] },
      'space-a',
      null,
      'Space root',
      'Untitled',
    );

    expect(current).toBeNull();
  });
});
