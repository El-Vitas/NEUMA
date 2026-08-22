import { afterEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import type { TrashedPage, TrashRestoreOutcome } from '@/modules/pages/trash/types/pages.trash.types';
import en from '../../../../../messages/en.json';

interface RestorePageInput {
  readonly includeChildren?: boolean;
  readonly pageId: string;
  readonly spaceId: string;
}

type RestorePageResult = { readonly data: TrashRestoreOutcome } | { readonly serverError: string };

const refresh = mock(() => undefined);
const restorePage = mock(
  async (_input: RestorePageInput): Promise<RestorePageResult> => ({
    data: { parentTitle: null, restoredChildCount: 0, restoredToRoot: false, spaceName: null },
  }),
);
const getPageRestorePreview = mock(async () => ({ data: { childPageCount: 0 } }));

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  restorePageAction: restorePage,
}));
mock.module('@/modules/pages/trash/server/actions/pages.trash.actions', () => ({
  getPageRestorePreviewAction: getPageRestorePreview,
  deletePageForeverAction: async () => ({ data: undefined }),
}));

const { PagesTrashItem } = await import('@/modules/pages/trash/components/pages.trash.item');

const page: TrashedPage = {
  deletedAt: new Date('2026-01-01T10:00:00.000Z'),
  deletedBy: { id: 'user-a', name: 'Ada Lovelace' },
  id: 'page-a',
  parentId: null,
  spaceId: 'space-a',
  title: 'Roadmap',
  trashedChildCount: 0,
};

const renderItem = (item: TrashedPage = page) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <ul>
        <PagesTrashItem locale="en" page={item} />
      </ul>
    </NextIntlClientProvider>,
  );

describe('PagesTrashItem', () => {
  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('shows who deleted the page and falls back to a placeholder title when it has none', () => {
    renderItem({ ...page, title: '' });

    expect(screen.getByText('Untitled')).toBeDefined();
    expect(screen.getByText(/Deleted by: Ada Lovelace/)).toBeDefined();
  });

  it('restores a page right away when it has no trashed children', async () => {
    getPageRestorePreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Restore page' }));

    await waitFor(() => {
      expect(restorePage).toHaveBeenCalledWith({ includeChildren: false, pageId: 'page-a', spaceId: 'space-a' });
      expect(refresh).toHaveBeenCalled();
    });
  });

  it('names the page and its space once the outcome says the page landed at the root', async () => {
    getPageRestorePreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    restorePage.mockImplementation(async () => ({
      data: { parentTitle: null, restoredChildCount: 0, restoredToRoot: true, spaceName: 'Engineering' },
    }));
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Restore page' }));

    expect(
      await screen.findByText(
        '"Roadmap" went back to the root of Engineering: the page that held it is no longer available.',
      ),
    ).toBeDefined();
  });

  it('names the parent it was restored under when the outcome reports one', async () => {
    getPageRestorePreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    restorePage.mockImplementation(async () => ({
      data: { parentTitle: 'Product', restoredChildCount: 0, restoredToRoot: false, spaceName: null },
    }));
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Restore page' }));

    expect(await screen.findByText('"Roadmap" went back under "Product".')).toBeDefined();
  });

  it('reports the restore as failed instead of a false success when the action does not answer with an outcome', async () => {
    getPageRestorePreview.mockImplementation(async () => ({ data: { childPageCount: 0 } }));
    restorePage.mockImplementation(async () => ({ serverError: 'unexpected' }));
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Restore page' }));

    expect(await screen.findByText('Could not restore the page. Try again.')).toBeDefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('asks whether to restore trashed children before restoring a page that has them', async () => {
    getPageRestorePreview.mockImplementation(async () => ({ data: { childPageCount: 2 } }));
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Restore page' }));

    expect(await screen.findByText('Restore its child pages too?')).toBeDefined();
    expect(restorePage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Restore the child pages too' }));

    await waitFor(() => {
      expect(restorePage).toHaveBeenCalledWith({ includeChildren: true, pageId: 'page-a', spaceId: 'space-a' });
    });
  });

  it('opens the delete-forever dialog from its own button', async () => {
    renderItem();

    fireEvent.click(screen.getByRole('button', { name: 'Delete forever' }));

    expect(await screen.findByText('Delete this page forever?')).toBeDefined();
  });
});
