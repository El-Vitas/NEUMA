import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PAGE_APPEARANCE_WIDTH_STYLE_CLASS } from '@/modules/pages/appearance/constants/pages.appearance.constants';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('server-only', () => ({}));

const push = mock((_href: string) => undefined);
mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  unstable_rethrow: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push, refresh: () => undefined, replace: () => undefined }),
}));
const renamePageAction = mock(async (_input: unknown) => ({ data: undefined }));
const trashPageAction = mock(async (_input: unknown) => ({ data: undefined }));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  createPageAction: async () => ({ data: undefined }),
  listPageMoveDestinationsAction: async () => ({ data: { pages: [], spaces: [] } }),
  movePageAction: async () => ({ data: undefined }),
  renamePageAction,
  trashPageAction,
}));
const updatePageRowPropertiesAction = mock(async (_input: unknown) => ({ data: undefined }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction,
}));
mock.module('@/modules/pages/trash/server/actions/pages.trash.actions', () => ({
  getPageTrashPreviewAction: async () => ({ data: { childPageCount: 0 } }),
}));
mock.module('@/modules/pages/appearance/server/actions/pages.cover.actions', () => ({
  removePageCoverAction: async () => ({ data: undefined }),
  repositionPageCoverAction: async () => ({ data: undefined }),
  uploadPageCoverImageAction: async () => ({ data: undefined }),
}));
mock.module('@/modules/pages/appearance/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));
mock.module('@/modules/pages/components/pages.prose-mirror.editor', () => ({
  PagesProseMirrorEditor: () => <div data-testid="page-editor-canvas" />,
}));
mock.module('@/modules/pages/attachments/components/pages.attachments', () => ({
  PagesAttachments: () => <div data-testid="page-attachments" />,
}));

const { PagesEditor } = await import('@/modules/pages/editor/components/pages.editor');

const SPACE_ID = '33333333-3333-4333-8333-333333333333';

const buildPage = (title: string, lifecycle: PageSummary['lifecycle'] = 'ACTIVE'): PageSummary => ({
  content: { content: [], schemaVersion: 1, type: 'doc' },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: null,
  id: '22222222-2222-4222-8222-222222222222',
  lifecycle,
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

  it('keeps what is written without anybody pressing anything', async () => {
    renamePageAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Create page' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Quarterly plan' } });

    await waitFor(() => expect(renamePageAction).toHaveBeenCalledTimes(1));
    expect(renamePageAction.mock.calls[0]?.[0]).toMatchObject({
      pageId: '22222222-2222-4222-8222-222222222222',
      title: 'Quarterly plan',
    });
  });
});

describe('a page hanging from a collection', () => {
  it('seeds default property values from the parent schema and keeps them with the page', async () => {
    updatePageRowPropertiesAction.mockClear();
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
                options: asPropertyOptions('todo', 'in_progress', 'done'),
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

    await waitFor(() => expect(updatePageRowPropertiesAction).toHaveBeenCalledTimes(1));
    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { blocked: true, status: 'todo' },
    });
  });

  // Sending the other properties back would overwrite what somebody else changed meanwhile.
  it('sends only the property that changed once the row already keeps its properties', async () => {
    updatePageRowPropertiesAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={{ ...buildPage('Kept row'), propertyValues: { blocked: false, status: 'in_progress' } }}
          pages={[]}
          parentBreadcrumbPages={[]}
          parentSchema={{
            pageId: 'collection-1',
            properties: [
              { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' },
              {
                key: 'status',
                label: 'Status',
                options: asPropertyOptions('todo', 'in_progress', 'done'),
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

    fireEvent.click(screen.getByRole('checkbox', { name: 'Blocked' }));

    await waitFor(() => expect(updatePageRowPropertiesAction).toHaveBeenCalledTimes(1));
    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).toMatchObject({ propertyValues: { blocked: true } });
    expect(updatePageRowPropertiesAction.mock.calls[0]?.[0]).not.toMatchObject({
      propertyValues: { status: 'in_progress' },
    });
    await waitFor(() => {
      const leaving = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(leaving);
      expect(leaving.defaultPrevented).toBe(false);
    });
  });
});

describe('sending the page open in the editor to the trash', () => {
  it('offers the control to whoever can write the page while it is active', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('Handbook')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('button', { name: 'Move to trash' })).toBeDefined();
  });

  it('stays away from a reader with no write access', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit={false}
          page={buildPage('Handbook')}
          pages={[]}
          parentBreadcrumbPages={[]}
          spaceId={SPACE_ID}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Move to trash' })).toBeNull();
  });

  it('stays away from a page that is already in the trash', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={buildPage('Handbook', 'TRASHED')}
          pages={[]}
          parentBreadcrumbPages={[]}
          spaceId={SPACE_ID}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Move to trash' })).toBeNull();
  });

  it('takes whoever confirmed it away from a page that no longer exists there', async () => {
    push.mockClear();
    trashPageAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor canEdit page={buildPage('Handbook')} pages={[]} parentBreadcrumbPages={[]} spaceId={SPACE_ID} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move to trash' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to trash' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/spaces/${SPACE_ID}`));
    expect(trashPageAction).toHaveBeenCalledWith({
      pageId: '22222222-2222-4222-8222-222222222222',
      spaceId: SPACE_ID,
    });
  });
});
