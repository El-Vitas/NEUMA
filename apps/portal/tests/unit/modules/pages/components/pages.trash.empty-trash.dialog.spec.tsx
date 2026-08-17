import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

const refresh = mock(() => undefined);
const emptyTrash = mock(async () => ({ data: undefined }));

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
mock.module('@/modules/pages/server/actions/pages.trash.actions', () => ({
  emptyTrashAction: emptyTrash,
}));

const { PagesTrashEmptyTrashDialog } = await import('@/modules/pages/components/pages.trash.empty-trash.dialog');

const renderDialog = (disabled = false) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesTrashEmptyTrashDialog disabled={disabled} />
    </NextIntlClientProvider>,
  );

describe('PagesTrashEmptyTrashDialog', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('disables the trigger when the trash has nothing to empty', () => {
    renderDialog(true);

    expect(screen.getByRole('button', { name: 'Empty the trash' })).toHaveProperty('disabled', true);
  });

  it('warns that attachments are deleted forever before emptying', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Empty the trash' }));

    expect(screen.getByText('Empty the trash?')).toBeDefined();
    expect(screen.getByText("The page's attachments are also deleted forever.")).toBeDefined();
  });

  it('empties the trash and refreshes once confirmed', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Empty the trash' }));
    const confirmButtons = screen.getAllByRole('button', { name: 'Empty the trash' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(emptyTrash).toHaveBeenCalledWith({});
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('closes without emptying when cancelled', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Empty the trash' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Empty the trash?')).toBeNull();
    expect(emptyTrash).not.toHaveBeenCalled();
  });
});
