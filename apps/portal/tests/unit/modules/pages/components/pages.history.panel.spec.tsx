import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster, toast } from 'sonner';
import type { PageVersionDocument, PageVersionListing } from '@/modules/pages/history/types/pages.history.types';
import en from '../../../../../messages/en.json';

type ListResult = { data: PageVersionListing } | { serverError: string };
type ReadResult = { data: PageVersionDocument } | { serverError: string };
type RestoreResult = { data: { id: string } } | { serverError: string };

const refresh = mock(() => undefined);

mock.module('server-only', () => ({}));
mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  unstable_rethrow: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push: () => undefined, refresh }),
}));

const listVersions = mock(async (_input: unknown): Promise<ListResult> => ({ data: firstPage }));
const readVersion = mock(async (_input: unknown): Promise<ReadResult> => ({ data: documentOf(2) }));
const restoreVersion = mock(async (_input: unknown): Promise<RestoreResult> => ({ data: { id: 'page-a' } }));

mock.module('@/modules/pages/history/server/actions/pages.history.actions', () => ({
  listPageVersionsAction: listVersions,
  readPageVersionAction: readVersion,
  restorePageVersionAction: restoreVersion,
}));

mock.module('@/modules/pages/history/components/pages.history.preview', () => ({
  PagesHistoryPreview: ({ document }: { readonly document: PageVersionDocument }) => (
    <div data-testid="version-preview">{`preview of ${document.title}`}</div>
  ),
}));

const { PagesHistoryPanel } = await import('@/modules/pages/history/components/pages.history.panel');

const documentOf = (version: number): PageVersionDocument => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  title: `Title of version ${String(version)}`,
  version,
});

const summary = (version: number, authorName: string | null) => ({
  author: authorName === null ? null : { id: `user-${authorName}`, name: authorName },
  createdAt: new Date('2026-10-20T10:00:00.000Z'),
  title: `Title of version ${String(version)}`,
  version,
});

const firstPage: PageVersionListing = {
  items: [summary(3, 'Ana Pérez'), summary(2, 'Beto Ruiz')],
  nextCursor: 2,
};
const lastPage: PageVersionListing = { items: [summary(1, null)], nextCursor: null };

const renderPanel = (props: Partial<Parameters<typeof PagesHistoryPanel>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Toaster />
      <PagesHistoryPanel canEdit pageId="page-a" spaceId="space-a" {...props} />
    </NextIntlClientProvider>,
  );

const openPanel = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Version history' }));
};

const resetMocks = (): void => {
  mock.clearAllMocks();
  listVersions.mockImplementation(async () => ({ data: firstPage }));
  readVersion.mockImplementation(async (input) => ({
    data: documentOf((input as { version: number }).version),
  }));
  restoreVersion.mockImplementation(async () => ({ data: { id: 'page-a' } }));
};

describe('PagesHistoryPanel', () => {
  afterEach(() => {
    resetMocks();
    cleanup();
    toast.dismiss();
  });

  it('says it is loading while the versions have not arrived', async () => {
    listVersions.mockImplementation(() => new Promise(() => undefined));
    renderPanel();

    openPanel();

    expect(await screen.findByText('Loading versions...')).toBeDefined();
  });

  it('lists the versions with their author and previews the newest one', async () => {
    renderPanel();

    openPanel();

    expect(await screen.findByRole('button', { name: /Ana Pérez/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Beto Ruiz/ })).toBeDefined();
    expect(listVersions).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a' });
    expect(await screen.findByTestId('version-preview')).toHaveProperty('textContent', 'preview of Title of version 3');
    expect(readVersion).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a', version: 3 });
  });

  it('names a version with no known author', async () => {
    listVersions.mockImplementation(async () => ({ data: lastPage }));
    renderPanel();

    openPanel();

    expect(await screen.findByRole('button', { name: /Unknown author/ })).toBeDefined();
  });

  it('says there is nothing to show for a page with no versions', async () => {
    listVersions.mockImplementation(async () => ({ data: { items: [], nextCursor: null } }));
    renderPanel();

    openPanel();

    expect(await screen.findByText('This page has no saved versions yet.')).toBeDefined();
  });

  it('shows a way to try again when the list cannot be read', async () => {
    listVersions.mockImplementationOnce(async () => ({ serverError: 'unexpected' }));
    renderPanel();

    openPanel();

    expect((await screen.findByRole('alert')).textContent).toContain('Could not load the version history.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /Ana Pérez/ })).toBeDefined();
  });

  it('asks for the next page of versions with the cursor and adds it to the list', async () => {
    listVersions.mockImplementationOnce(async () => ({ data: firstPage }));
    listVersions.mockImplementationOnce(async () => ({ data: lastPage }));
    renderPanel();
    openPanel();
    await screen.findByRole('button', { name: /Ana Pérez/ });

    fireEvent.click(screen.getByRole('button', { name: 'Load more versions' }));

    expect(await screen.findByRole('button', { name: /Unknown author/ })).toBeDefined();
    expect(listVersions).toHaveBeenLastCalledWith({ cursor: 2, pageId: 'page-a', spaceId: 'space-a' });
    expect(screen.queryByRole('button', { name: 'Load more versions' })).toBeNull();
    expect(screen.getByRole('button', { name: /Ana Pérez/ })).toBeDefined();
  });

  it('previews the version that is picked and marks it as the current choice', async () => {
    renderPanel();
    openPanel();
    await screen.findByTestId('version-preview');

    fireEvent.click(screen.getByRole('button', { name: /Beto Ruiz/ }));

    await waitFor(() => {
      expect(screen.getByTestId('version-preview').textContent).toBe('preview of Title of version 2');
    });
    expect(screen.getByRole('button', { name: /Beto Ruiz/ }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /Ana Pérez/ }).getAttribute('aria-current')).toBeNull();
  });

  it('says the version could not be read and keeps the list usable', async () => {
    renderPanel();
    openPanel();
    await screen.findByTestId('version-preview');
    readVersion.mockImplementationOnce(async () => ({ serverError: 'missing' }));

    fireEvent.click(screen.getByRole('button', { name: /Beto Ruiz/ }));

    expect(await screen.findByText('Could not load this version.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Restore this version' })).toBeNull();
    expect(screen.getByRole('button', { name: /Ana Pérez/ })).toBeDefined();
  });

  describe('restoring', () => {
    const askToRestore = async (): Promise<void> => {
      renderPanel();
      openPanel();
      await screen.findByTestId('version-preview');
      fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    };

    it('asks for confirmation and does nothing until it is given', async () => {
      await askToRestore();

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Restore this version?')).toBeDefined();
      expect(restoreVersion).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(restoreVersion).not.toHaveBeenCalled();
    });

    it('restores the chosen version once confirmed, tells the person and closes the panel', async () => {
      await askToRestore();

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));

      await waitFor(() => {
        expect(restoreVersion).toHaveBeenCalledWith({ pageId: 'page-a', spaceId: 'space-a', version: 3 });
      });
      expect(await screen.findByText('Version restored')).toBeDefined();
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(refresh).toHaveBeenCalled();
    });

    it('says the page is locked, with the message the rest of the page uses, and keeps the question open', async () => {
      restoreVersion.mockImplementation(async () => ({ serverError: 'locked' }));
      await askToRestore();

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));

      expect((await within(dialog).findByRole('alert')).textContent).toBe(
        'This page is locked. Unlock it to change it.',
      );
      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(refresh).not.toHaveBeenCalled();
    });

    it('says what went wrong when the restore fails for another reason', async () => {
      restoreVersion.mockImplementation(async () => ({ serverError: 'forbidden' }));
      await askToRestore();

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));

      expect((await within(dialog).findByRole('alert')).textContent).toBe('You do not have permission to do this.');
    });
  });

  it('offers no restore to someone who cannot edit the page, and still lets them look', async () => {
    renderPanel({ canEdit: false });

    openPanel();

    expect(await screen.findByTestId('version-preview')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Restore this version' })).toBeNull();
    expect(screen.getByText('Versions can be restored only while the page can be edited.')).toBeDefined();
  });
});
