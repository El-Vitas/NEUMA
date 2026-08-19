import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PAGE_APPEARANCE_WIDTH_STYLE_CLASS } from '@/modules/pages/constants/pages.appearance.constants';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));

mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined }),
}));
const updatePageAction = mock(async (_input: unknown) => ({ data: undefined }));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  createPageAction: async () => ({ data: undefined }),
  listPageMoveDestinationsAction: async () => ({ data: { pages: [], spaces: [] } }),
  movePageAction: async () => ({ data: undefined }),
  updatePageAction,
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
mock.module('@/modules/pages/components/pages.prose-mirror.editor', () => ({
  PagesProseMirrorEditor: () => <div data-testid="page-editor-canvas" />,
}));
mock.module('@/modules/pages/components/pages.attachments', () => ({
  PagesAttachments: () => <div data-testid="page-attachments" />,
}));

const { PagesEditor } = await import('@/modules/pages/components/pages.editor');

const SPACE_ID = '33333333-3333-4333-8333-333333333333';

const buildPage = (title: string): PageSummary => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '22222222-2222-4222-8222-222222222222',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  propertyValues: null,
  spaceId: SPACE_ID,
  title,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: null,
  version: 1,
});

describe('PagesEditor layout', () => {
  it('holds the whole width it has to fill, applying the same reading width as its own header rather than none at all', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('Handbook')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    const workspace = screen.getByTestId('page-editor-workspace');
    const header = container.querySelector('header');

    expect(workspace.classList.contains('w-full')).toBe(true);
    expect(workspace.classList.contains(PAGE_APPEARANCE_WIDTH_STYLE_CLASS)).toBe(true);
    expect(header?.classList.contains(PAGE_APPEARANCE_WIDTH_STYLE_CLASS)).toBe(true);
  });
});

describe('a page that nobody has named yet', () => {
  it('opens on its own name, which is where writing it begins', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Title' }));
  });

  /** Nothing is asked for before writing: naming it is already a change the page keeps by itself. */
  it('keeps what is written without anybody pressing anything', async () => {
    updatePageAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Create page' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Quarterly plan' } });

    await waitFor(() => expect(updatePageAction).toHaveBeenCalledTimes(1));
    expect(updatePageAction.mock.calls[0]?.[0]).toMatchObject({
      pageId: '22222222-2222-4222-8222-222222222222',
      title: 'Quarterly plan',
    });
  });
});

describe('a page hanging from a collection', () => {
  it('seeds default property values from the parent schema and keeps them with the page', async () => {
    updatePageAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={buildPage('')}
          pages={[]}
          parentBreadcrumbPages={[]}
          parentSchema={{
            pageId: 'collection-1',
            properties: [
              { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' },
              {
                key: 'status',
                label: 'Status',
                options: ['todo', 'in_progress', 'done'],
                required: true,
                type: 'SELECT',
              },
              { key: 'blocked', label: 'Blocked', options: null, required: false, type: 'CHECKBOX' },
            ],
            spaceId: SPACE_ID,
            views: [],
          }}
          spaceId={SPACE_ID}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByLabelText('Title')).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Blocked' }));

    await waitFor(() => expect(updatePageAction).toHaveBeenCalledTimes(1));
    expect(updatePageAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { blocked: true, status: 'todo' },
    });
  });
});
