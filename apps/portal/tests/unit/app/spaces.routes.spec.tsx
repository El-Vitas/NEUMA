import { describe, expect, it, mock } from 'bun:test';
import { createElement } from 'react';

const spaceId = '22222222-2222-4222-8222-222222222222';
const succeeded = <Value,>(value: Value) => ({
  getError: () => new Error('not a failure'),
  getValue: () => value,
  isFail: () => false,
  isOk: () => true,
});
const failed = (message: string) => ({
  getError: () => new Error(message),
  getValue: () => [],
  isFail: () => true,
  isOk: () => false,
});
const space = { description: null, icon: null, id: spaceId, name: 'Engineering', order: 0, ownerId: null, slug: 'eng' };

const getSpaces = mock(async (): Promise<unknown> => succeeded([space]));
const getTreeRoots = mock(async (): Promise<unknown> => succeeded({ entries: [], total: 1 }));

mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
mock.module('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => (key: string) => key,
}));
mock.module('@/shared/server/lib/current-user.server', () => ({ getCurrentUser: async () => ({ role: 'ADMIN' }) }));
mock.module('@/modules/spaces/server/queries/spaces.queries', () => ({
  getSpaceMembers: async () => succeeded([]),
  getSpaces,
}));
mock.module('@/modules/pages/tree/server/queries/pages.tree.queries', () => ({
  getRecentPages: async () => succeeded([]),
  getTreeRoots,
}));
mock.module('@/modules/spaces/components/spaces.empty.state', () => ({ SpacesEmptyState: () => createElement('div') }));
mock.module('@/modules/spaces/views/spaces.home.view', () => ({ SpacesHomeView: () => createElement('div') }));
mock.module('@/modules/spaces/components/spaces.settings.form', () => ({
  SpacesSettingsForm: () => createElement('div'),
}));

const { default: SpaceHomePage } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/page');
const { default: SpaceSettingsPage } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/settings/page');

const params = Promise.resolve({ spaceId });

describe('space routes when the backend cannot be reached', () => {
  it('raises the failure of the space list instead of saying the space does not exist', async () => {
    getSpaces.mockImplementationOnce(async () => failed('Spaces unreachable'));

    await expect(SpaceHomePage({ params })).rejects.toThrow('Spaces unreachable');
  });

  it('raises the failure of the roots read instead of drawing a dead end', async () => {
    getTreeRoots.mockImplementationOnce(async () => failed('Roots unreachable'));

    await expect(SpaceHomePage({ params })).rejects.toThrow('Roots unreachable');
  });

  it('says a space does not exist only when the list was read and it is not in it', async () => {
    getSpaces.mockImplementationOnce(async () => succeeded([]));

    await expect(SpaceHomePage({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('raises the failure of the space list on the settings page', async () => {
    getSpaces.mockImplementationOnce(async () => failed('Spaces unreachable'));

    await expect(SpaceSettingsPage({ params })).rejects.toThrow('Spaces unreachable');
  });

  it('says the space of the settings page does not exist when the list does not hold it', async () => {
    getSpaces.mockImplementationOnce(async () => succeeded([]));

    await expect(SpaceSettingsPage({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
