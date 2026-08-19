import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import en from '../../../../../messages/en.json';

const trashPage = mock(async () => ({ data: undefined }));
const getPageTrashPreview = mock(async () => ({ data: { childPageCount: 0 } }));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  trashPageAction: trashPage,
}));
mock.module('@/modules/pages/server/actions/pages.trash.actions', () => ({
  getPageTrashPreviewAction: getPageTrashPreview,
}));

const { PagesTrashConfirmDialog } = await import('@/modules/pages/components/pages.trash.confirm.dialog');

const page = { id: 'page-a', title: 'Roadmap' };

const renderDialog = (props: Partial<Parameters<typeof PagesTrashConfirmDialog>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesTrashConfirmDialog onClose={() => {}} page={page} spaceId="space-a" {...props} />
    </NextIntlClientProvider>,
  );

describe('PagesTrashConfirmDialog', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('renders nothing when there is no page to trash', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesTrashConfirmDialog onClose={() => {}} page={null} spaceId="space-a" />
      </NextIntlClientProvider>,
    );

    expect(container.textContent).toBe('');
  });

  it('asks for confirmation before trashing', () => {
    renderDialog();

    expect(screen.getByText('Move this page to the trash?')).toBeDefined();
  });

  it('warns that child pages move to the trash along with their parent, not that they are deleted', async () => {
    getPageTrashPreview.mockImplementation(async () => ({ data: { childPageCount: 3 } }));
    renderDialog();

    expect(await screen.findByText(/This will also move 3 child pages to the trash/)).toBeDefined();
  });

  it('trashes the page and reports success once confirmed', async () => {
    getPageTrashPreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    const onClose = mock(() => undefined);
    const onTrashed = mock(() => undefined);
    renderDialog({ onClose, onTrashed });

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }));

    await waitFor(() => {
      expect(trashPage).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a' });
      expect(onTrashed).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('closes without trashing when cancelled', () => {
    const onClose = mock(() => undefined);
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(trashPage).not.toHaveBeenCalled();
  });
});
