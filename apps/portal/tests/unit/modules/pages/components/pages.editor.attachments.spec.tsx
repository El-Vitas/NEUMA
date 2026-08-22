import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createEmptyPageContent } from '@/modules/pages/editor/lib/pages.editor.lib';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));

mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push: () => undefined, refresh: () => undefined, replace: () => undefined }),
}));

mock.module('@/modules/pages/hooks/use.pages.collaboration', () => ({
  usePagesCollaboration: () => ({ participants: [], session: null, status: null }),
}));

mock.module('@/modules/pages/hooks/use.pages.mention-search', () => ({
  usePagesMentionSearch: () => ({ candidates: [], isLoading: false }),
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  addBlocksToPageAction: async () => ({ data: undefined }),
  authenticatedRequest: async () => undefined,
  createPageAction: async () => ({ data: undefined }),
  duplicatePageAction: async () => ({ data: undefined }),
  listPageDestinationsAction: async () => ({ data: [] }),
  listPageMoveDestinationsAction: async () => ({ data: { pages: [], spaces: [] } }),
  movePageAction: async () => ({ data: undefined }),
  renamePageAction: async () => ({ data: undefined }),
  restorePageAction: async () => ({ data: undefined }),
  setPageLockAction: async () => ({ data: undefined }),
  trashPageAction: async () => ({ data: undefined }),
  updatePageAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/pages/server/actions/pages.trash.actions', () => ({
  getPageTrashPreviewAction: async () => ({ data: { childPageCount: 0 } }),
}));

mock.module('@/modules/pages/server/actions/pages.cover.actions', () => ({
  removePageCoverAction: async () => ({ data: undefined }),
  repositionPageCoverAction: async () => ({ data: undefined }),
  uploadPageCoverImageAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/pages/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/pages/server/actions/pages.collections.actions', () => ({
  createPageCollectionAction: async () => ({ data: undefined }),
  readPageCollectionAction: async () => ({ data: null }),
}));

mock.module('@/modules/pages/server/actions/pages.person.actions', () => ({
  searchPagePersonCandidatesAction: async () => ({ data: [] }),
}));

mock.module('@/modules/pages/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => ({ serverError: 'request' }),
  uploadPageAttachmentAction: async () => ({
    data: {
      id: '44444444-4444-4444-8444-444444444444',
      mimeType: 'image/png',
      originalFilename: 'diagram.png',
      size: 1024,
      uploadedBy: 'Jane Doe',
    },
  }),
}));

const { PagesEditor } = await import('@/modules/pages/editor/components/pages.editor');

const SPACE_ID = '33333333-3333-4333-8333-333333333333';
const PAGE_ID = '22222222-2222-4222-8222-222222222222';

const buildPage = (): PageSummary => ({
  content: createEmptyPageContent(),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: PAGE_ID,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: SPACE_ID,
  title: 'Handbook',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

describe('a file inserted directly in the page content', () => {
  it('also shows up in the attachments panel, without asking to upload it twice', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage()} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    const contentFileInput = screen.getByLabelText('Choose a file', { selector: 'input' });
    fireEvent.change(contentFileInput, {
      target: { files: [new File(['image'], 'diagram.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText('Show 2 more')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

    await waitFor(() => expect(screen.getByText('diagram.png')).toBeDefined());
  });

  it('also shows up when the file arrives by dragging it onto the writing surface', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage()} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    const writingSurface = container.querySelector('.ProseMirror');
    expect(writingSurface).not.toBeNull();
    if (writingSurface === null) return;
    fireEvent.drop(writingSurface, {
      dataTransfer: { files: [new File(['image'], 'diagram.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getByText('Show 2 more')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));

    await waitFor(() => expect(screen.getByText('diagram.png')).toBeDefined());
  });
});
