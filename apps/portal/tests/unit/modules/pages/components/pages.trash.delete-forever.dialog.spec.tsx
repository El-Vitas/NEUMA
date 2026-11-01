import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

const deletePageForever = mock(async () => ({ data: undefined }));

mock.module('@/modules/pages/trash/server/actions/pages.trash.actions', () => ({
  deletePageForeverAction: deletePageForever,
}));

const { PagesTrashDeleteForeverDialog } = await import(
  '@/modules/pages/trash/components/pages.trash.delete-forever.dialog'
);

const page = { id: 'page-a', spaceId: 'space-a', title: 'Roadmap' };

const renderDialog = (props: Partial<Parameters<typeof PagesTrashDeleteForeverDialog>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesTrashDeleteForeverDialog onClose={() => {}} page={page} {...props} />
    </NextIntlClientProvider>,
  );

describe('PagesTrashDeleteForeverDialog', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('renders nothing when there is no page to delete', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesTrashDeleteForeverDialog onClose={() => {}} page={null} />
      </NextIntlClientProvider>,
    );

    expect(container.textContent).toBe('');
  });

  it('says the page goes in 30 days, attachments included', () => {
    renderDialog();

    expect(screen.getByText(/erased in 30 days/)).toBeDefined();
    expect(screen.getByText('Its attachments are erased along with the page.')).toBeDefined();
  });

  it('deletes the page forever and reports success once confirmed', async () => {
    const onClose = mock(() => undefined);
    const onDeleted = mock(() => undefined);
    renderDialog({ onClose, onDeleted });

    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }));

    await waitFor(() => {
      expect(deletePageForever).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a' });
      expect(onDeleted).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes without deleting when cancelled', () => {
    const onClose = mock(() => undefined);
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(deletePageForever).not.toHaveBeenCalled();
  });
});
