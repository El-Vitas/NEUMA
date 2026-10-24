import { afterEach, describe, expect, it, mock } from 'bun:test';

const SPACE_ID = '33333333-3333-4333-8333-333333333333';

const readTreeWindow = mock(async () => ({
  entries: [
    { id: 'top-1', title: 'Top one' },
    { id: 'top-2', title: 'Top two' },
  ],
  total: 2,
}));
const getSearchResults = mock(async (_query: unknown) => ({
  getValue: () => ({
    items: [
      { sourceId: 'found-1', spaceId: SPACE_ID, title: 'Found one' },
      { sourceId: 'found-2', spaceId: SPACE_ID, title: 'Found two' },
    ],
  }),
  isFail: () => false,
}));

mock.module('server-only', () => ({}));
mock.module('@/shared/lib/auth.token.lib', () => ({ requireAccessTokenCookie: async () => 'token' }));
mock.module('@/shared/server/queries/search.queries', () => ({ getSearchResults }));
mock.module('@/modules/pages/tree/server/lib/pages.tree.server', () => ({ readTreeWindow }));

const { readPageDestinations } = await import('@/modules/pages/server/lib/pages.destinations.server');

describe('readPageDestinations', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('lists the top of the space while nothing is written, without asking the search', async () => {
    const destinations = await readPageDestinations(SPACE_ID, '', null);

    expect(destinations.map((destination) => destination.label)).toEqual(['Top one', 'Top two']);
    expect(getSearchResults).not.toHaveBeenCalled();
  });

  it('asks the search of the space once something is written', async () => {
    const destinations = await readPageDestinations(SPACE_ID, 'found', null);

    expect(destinations.map((destination) => destination.id)).toEqual(['found-1', 'found-2']);
    expect(getSearchResults).toHaveBeenCalledWith(expect.objectContaining({ query: 'found', spaceId: SPACE_ID }));
    expect(readTreeWindow).not.toHaveBeenCalled();
  });

  it('leaves out the page being moved, which cannot be its own destination', async () => {
    const destinations = await readPageDestinations(SPACE_ID, '', 'top-1');

    expect(destinations.map((destination) => destination.id)).toEqual(['top-2']);
  });
});
