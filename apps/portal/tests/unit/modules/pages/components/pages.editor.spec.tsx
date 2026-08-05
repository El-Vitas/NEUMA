import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const replace = mock(() => undefined);
mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ refresh: () => undefined, replace }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({
    data: {
      content: { content: [], schemaVersion: 1, type: 'doc' },
      id: '22222222-2222-4222-8222-222222222222',
      lifecycle: 'ACTIVE',
      order: 0,
      parentId: null,
      spaceId: '33333333-3333-4333-8333-333333333333',
      title: 'New page',
      version: 1,
    },
  }),
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
  it('gives a new document a broad adaptive work canvas', () => {
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

    expect(screen.getByTestId('page-editor-workspace').classList.contains('max-w-[100rem]')).toBe(true);
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
