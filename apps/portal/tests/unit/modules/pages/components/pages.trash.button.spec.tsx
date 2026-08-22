import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

const trashPage = mock(async () => ({ data: undefined }));
const getPageTrashPreview = mock(async () => ({ data: { childPageCount: 0 } }));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  trashPageAction: trashPage,
}));
mock.module('@/modules/pages/trash/server/actions/pages.trash.actions', () => ({
  getPageTrashPreviewAction: getPageTrashPreview,
}));

const { PagesTrashButton } = await import('@/modules/pages/trash/components/pages.trash.button');

const renderButton = (onTrashed: () => void = () => undefined) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesTrashButton onTrashed={onTrashed} pageId="page-a" spaceId="space-a" title="Roadmap" />
    </NextIntlClientProvider>,
  );

describe('PagesTrashButton', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('has a large enough, named target and asks nothing until pressed', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Move to trash' });
    expect(button.className).toContain('size-11');
    expect(screen.queryByText('Move this page to the trash?')).toBeNull();
  });

  it('asks for confirmation before sending the page to the trash', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }));

    expect(screen.getByText('Move this page to the trash?')).toBeDefined();
  });

  it('trashes the page and reports it once confirmed', async () => {
    getPageTrashPreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    const onTrashed = mock(() => undefined);
    renderButton(onTrashed);

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to trash' }));

    await waitFor(() => {
      expect(trashPage).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a' });
      expect(onTrashed).toHaveBeenCalled();
    });
  });

  it('closes the confirmation without trashing when cancelled', () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Move this page to the trash?')).toBeNull();
    expect(trashPage).not.toHaveBeenCalled();
  });
});
