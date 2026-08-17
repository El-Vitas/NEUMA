import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS } from '@/modules/pages/constants/pages.appearance.constants';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));

const replace = mock(() => undefined);
mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ refresh: () => undefined, replace }),
}));
const createPageAction = mock(async (_input: unknown) => ({
  data: {
    content: { content: [], schemaVersion: 1, type: 'doc' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: null,
    id: '22222222-2222-4222-8222-222222222222',
    lifecycle: 'ACTIVE',
    order: 0,
    parentId: null,
    propertyValues: null,
    spaceId: '33333333-3333-4333-8333-333333333333',
    title: 'New page',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedBy: null,
    version: 1,
  },
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction,
  movePageAction: async () => ({ data: undefined }),
  updatePageAction: async () => ({ data: undefined }),
}));
mock.module('@/modules/pages/components/pages.prose-mirror.editor', () => ({
  PagesProseMirrorEditor: () => <div data-testid="page-editor-canvas" />,
}));
mock.module('@/modules/pages/components/pages.attachments', () => ({
  PagesAttachments: () => <div data-testid="page-attachments" />,
}));

const { PagesEditor } = await import('@/modules/pages/components/pages.editor');

describe('PagesEditor creation', () => {
  it('holds the whole width it has to fill, applying the same reading width as its own header rather than none at all', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={null}
          pageId={null}
          pages={[]}
          parentBreadcrumbPages={[]}
          parentId={null}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    const workspace = screen.getByTestId('page-editor-workspace');
    const header = container.querySelector('header');

    expect(workspace.classList.contains('w-full')).toBe(true);
    expect(workspace.classList.contains(PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS)).toBe(true);
    expect(header?.classList.contains(PAGE_APPEARANCE_CONSTRAINED_WIDTH_STYLE_CLASS)).toBe(true);
  });

  it('focuses the title and opens the created page at its stable URL', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={null}
          pageId={null}
          pages={[]}
          parentBreadcrumbPages={[]}
          parentId={null}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    const title = screen.getByRole('textbox', { name: 'Title' });
    expect(document.activeElement).toBe(title);

    fireEvent.change(title, { target: { value: 'New page' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create page' }));

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        '/spaces/33333333-3333-4333-8333-333333333333/pages/22222222-2222-4222-8222-222222222222',
      ),
    );
  });
});

describe('PagesEditor creation from a schema-carrying parent', () => {
  it('seeds default property values from the parent schema and sends them on create', async () => {
    createPageAction.mockClear();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesEditor
          canEdit
          page={null}
          pageId={null}
          pages={[]}
          parentBreadcrumbPages={[]}
          parentId="collection-1"
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
            spaceId: '33333333-3333-4333-8333-333333333333',
            views: [],
          }}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByLabelText('Title')).toHaveLength(1);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Blocked' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'New task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create page' }));

    await waitFor(() => expect(createPageAction).toHaveBeenCalledTimes(1));
    expect(createPageAction.mock.calls[0]?.[0]).toMatchObject({
      propertyValues: { blocked: true, status: 'todo' },
    });
  });
});
