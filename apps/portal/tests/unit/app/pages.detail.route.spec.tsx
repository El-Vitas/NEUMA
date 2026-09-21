import { describe, expect, it, mock } from 'bun:test';
import type { UserRole } from '@company-brain/shared';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

const currentUser = mock(async (): Promise<{ readonly role: UserRole }> => ({ role: 'ADMIN' }));
const getPageAttachments = mock(async () => ({
  getError: () => new Error('Attachment list unavailable'),
  getValue: () => [],
  isFail: () => true,
  isOk: () => false,
}));
const getPageBacklinks = mock(async () => ({
  getError: () => new Error('Backlinks unavailable'),
  getValue: () => ({ count: 0, items: [] }),
  isFail: () => true,
  isOk: () => false,
}));
const pageId = '44444444-4444-4444-8444-444444444444';
const spaceId = '22222222-2222-4222-8222-222222222222';
const pagesResult = {
  getValue: () => [
    {
      content: { content: [], schemaVersion: 1, type: 'doc' },
      id: pageId,
      lifecycle: 'ACTIVE',
      order: 0,
      parentId: null,
      title: 'Getting Started',
    },
  ],
  isOk: () => true,
};
const spacesResult = {
  getValue: () => [{ id: spaceId, name: 'Engineering' }],
  isOk: () => true,
};
const workspace = mock((props: { readonly attachments: readonly { readonly id: string }[] }) =>
  createElement('div', { 'data-attachment-count': props.attachments.length, 'data-testid': 'page-workspace' }),
);

mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  useSearchParams: () => new URLSearchParams(),
}));
mock.module('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => (key: string) => key,
}));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) =>
    createElement('a', { href }, children),
  /** The route sends an address that lost its page to wherever the page went. */
  redirect: () => undefined,
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('@/shared/server/lib/current-user.server', () => ({ getCurrentUser: currentUser }));
mock.module('@/modules/favorites/server/queries/favorites.queries', () => ({
  getFavoritePages: async () => ({ getValue: () => [], isOk: () => true }),
}));
mock.module('@/modules/pages/components/pages.workspace', () => ({ PagesWorkspace: workspace }));
mock.module('@/modules/pages/attachments/server/queries/pages.attachments.queries', () => ({ getPageAttachments }));
mock.module('@/modules/pages/links/server/queries/pages.backlinks.queries', () => ({ getPageBacklinks }));
mock.module('@/modules/pages/server/queries/pages.queries', () => ({
  getPages: async () => pagesResult,
  /** The route asks where a page lives when the address does not find it here. */
  getPageSpaceId: async () => ({ isFail: () => true, isOk: () => false }),
}));
mock.module('@/modules/pages/collections/server/queries/pages.schema.queries', () => ({
  getPageSchema: async () => ({ getValue: () => ({ pageId, properties: [], spaceId, views: [] }), isOk: () => true }),
  getPageView: async () => ({ getValue: () => ({ kind: 'FLAT_ROWS', rows: [] }), isOk: () => true }),
}));
/** The collection settings and the board reach server actions, which a browser-shaped test cannot load. */
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageViewConfigurationAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
/** El tablero crea y reordena filas, y esas acciones no se cargan en una prueba con forma de navegador. */
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));
mock.module('@/modules/spaces/server/queries/spaces.queries', () => ({
  getSpaceMembers: async () => ({ getValue: () => [], isOk: () => true }),
  getSpaces: async () => spacesResult,
}));

const { default: Page } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/pages/[pageId]/page');

describe('page detail route attachments', () => {
  it('renders the document when attachment loading fails', async () => {
    const result = await Page({ params: Promise.resolve({ pageId, spaceId }) });

    render(result);

    expect(screen.getByTestId('page-workspace').getAttribute('data-attachment-count')).toBe('0');
  });
});
