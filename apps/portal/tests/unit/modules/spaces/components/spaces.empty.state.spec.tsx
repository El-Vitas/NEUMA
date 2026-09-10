import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

/** Starting a page reaches a server action, which refuses to load outside a server. */
const startedSpaceIds: string[] = [];
const startedCollectionSpaceIds: string[] = [];
mock.module('@/shared/hooks/use.pages-start.hook', () => ({
  usePagesStart: () => ({
    isStarting: false,
    startCollection: (spaceId: string) => {
      startedCollectionSpaceIds.push(spaceId);
    },
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

  /**
   * Lo único que se pregunta es de qué clase: elegida, la página se hace y se
   * abre, sin un formulario de por medio.
   */
  it('asks an editor what to start, and starts it', async () => {
    startedSpaceIds.length = 0;
    startedCollectionSpaceIds.length = 0;
    renderSpacesEmptyState(true);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Create first page' }),
      new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Page' }));

    expect(startedSpaceIds).toEqual(['engineering']);
    expect(startedCollectionSpaceIds).toEqual([]);
  });

  it('starts a collection when that is what was asked for', async () => {
    startedSpaceIds.length = 0;
    startedCollectionSpaceIds.length = 0;
    renderSpacesEmptyState(true);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Create first page' }),
      new PointerEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Collection' }));

    expect(startedCollectionSpaceIds).toEqual(['engineering']);
    expect(startedSpaceIds).toEqual([]);
  });

  it('does not offer page creation to members who cannot edit content', () => {
    renderSpacesEmptyState(false);

    expect(screen.queryByRole('button', { name: 'Create first page' })).toBeNull();
  });
});
