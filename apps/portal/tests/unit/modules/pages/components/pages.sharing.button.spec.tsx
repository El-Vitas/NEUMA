import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { BlockAccess } from '@/modules/pages/sharing/types/pages.sharing.types';
import en from '../../../../../messages/en.json';

const access: BlockAccess = {
  blockId: 'page-1',
  entries: [],
  inherited: { entries: [], source: null },
  isDeclaredHere: false,
  members: [{ canReadSpace: true, email: 'admin@example.com', id: 'admin', name: 'Admin', workspaceRole: 'ADMIN' }],
  source: null,
  spaceId: 'space-1',
  viewerId: 'admin',
};
const getBlockAccess = mock(async () => ({ data: access }));
const setBlockPermissions = mock(async () => ({ data: { blockId: 'page-1' } }));

mock.module('@/modules/pages/sharing/server/actions/pages.sharing.actions', () => ({
  getBlockAccessAction: getBlockAccess,
  setBlockPermissionsAction: setBlockPermissions,
}));

const { PagesSharingButton } = await import('@/modules/pages/sharing/components/pages.sharing.button');

const renderButton = (props: Partial<Parameters<typeof PagesSharingButton>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesSharingButton hasOwnPermissions={false} pageId="page-1" spaceId="space-1" title="Roadmap" {...props} />
    </NextIntlClientProvider>,
  );

describe('PagesSharingButton', () => {
  afterEach(() => {
    mock.clearAllMocks();
  });

  it('offers to share the page and has no lock while the page follows its parent', () => {
    renderButton();

    expect(screen.getByRole('button', { name: 'Share this page' })).toBeDefined();
    expect(screen.queryByText('This page has its own access settings')).toBeNull();
  });

  it('shows a lock when the page has its own access settings', () => {
    renderButton({ hasOwnPermissions: true });

    expect(screen.getByText('This page has its own access settings')).toBeDefined();
  });

  it('opens the dialog for the page and closes it again', async () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Share this page' }));

    expect(await screen.findByRole('dialog')).toBeDefined();
    expect(getBlockAccess).toHaveBeenCalledWith({ blockId: 'page-1' });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows the lock as soon as the page stops inheriting, and tells the caller', async () => {
    const onChanged = mock(() => undefined);
    renderButton({ onChanged });
    fireEvent.click(screen.getByRole('button', { name: 'Share this page' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stop inheriting' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('This page has its own access settings')).toBeDefined();
    });
    expect(onChanged).toHaveBeenCalledWith({ blockId: 'page-1', hasOwnPermissions: true });
  });
});
