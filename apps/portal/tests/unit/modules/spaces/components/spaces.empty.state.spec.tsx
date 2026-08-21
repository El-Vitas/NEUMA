import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

/** Starting a page reaches a server action, which refuses to load outside a server. */
const startedSpaceIds: string[] = [];
mock.module('@/shared/hooks/use.pages-start.hook', () => ({
  usePagesStart: () => ({
    isStarting: false,
    startPage: (spaceId: string) => {
      startedSpaceIds.push(spaceId);
    },
  }),
}));

const { SpacesEmptyState } = await import('@/modules/spaces/components/spaces.empty.state');

const renderSpacesEmptyState = (canCreatePage: boolean) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SpacesEmptyState canCreatePage={canCreatePage} spaceId="engineering" />
    </NextIntlClientProvider>,
  );

describe('SpacesEmptyState', () => {
  it('explains how to start a space that has nothing in it yet', () => {
    renderSpacesEmptyState(true);

    expect(screen.getByText("Create the first page to start organizing this space's knowledge.")).toBeDefined();
  });

  /** The page is made and opened by the button itself: there is no form standing between the two. */
  it('lets an editor start the first page straight from the empty state', () => {
    startedSpaceIds.length = 0;
    renderSpacesEmptyState(true);

    screen.getByRole('button', { name: 'Create first page' }).click();

    expect(startedSpaceIds).toEqual(['engineering']);
  });

  it('does not offer page creation to members who cannot edit content', () => {
    renderSpacesEmptyState(false);

    expect(screen.queryByRole('button', { name: 'Create first page' })).toBeNull();
  });
});
