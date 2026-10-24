import { describe, expect, it, mock } from 'bun:test';
import type { UserRole } from '@neuma/shared';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { COLLECTION_ACTION_STUBS } from '../modules/pages/stubs/pages.actions.stubs';

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
const storedPage = {
  canEdit: true,
  content: { content: [], schemaVersion: 1, type: 'doc' },
  id: pageId,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  title: 'Getting Started',
};
const pageResult = { getValue: () => storedPage, isFail: () => false, isOk: () => true };
const tree = {
  ancestors: [
    { icon: null, id: 'top', isReadable: true, lifecycle: 'ACTIVE', title: 'Top' },
    { icon: null, id: null, isReadable: false, lifecycle: null, title: null },
  ],
  levels: [{ entries: [], parentId: null, skip: 0, total: 0 }],
  page: { id: pageId, lifecycle: 'ACTIVE' },
};
const spacesResult = {
  getValue: () => [{ id: spaceId, name: 'Engineering' }],
  isFail: () => false,
  isOk: () => true,
};
const getSpaces = mock(async () => spacesResult);
const workspace = mock(
  (props: {
    readonly ancestors: readonly { readonly id: string }[];
    readonly attachments: readonly { readonly id: string }[];
    readonly treeLevels?: readonly unknown[];
  }) =>
    createElement('div', {
      'data-ancestor-ids': props.ancestors.map((ancestor) => ancestor.id).join(','),
      'data-attachment-count': props.attachments.length,
      'data-testid': 'page-workspace',
      'data-tree-level-count': props.treeLevels?.length ?? 'none',
    }),
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
  redirect: () => undefined,
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('@/shared/server/lib/current-user.server', () => ({ getCurrentUser: currentUser }));
mock.module('@/shared/server/lib/time-zone.server', () => ({ readRequestTimeZone: async () => null }));
mock.module('@/shared/server/actions/time-zone.actions', () => ({ rememberTimeZoneAction: async () => undefined }));
mock.module('@/modules/favorites/server/queries/favorites.queries', () => ({
  getFavoritePages: async () => ({ getValue: () => [], isOk: () => true }),
}));
mock.module('@/modules/pages/components/pages.workspace', () => ({ PagesWorkspace: workspace }));
mock.module('@/modules/pages/attachments/server/queries/pages.attachments.queries', () => ({ getPageAttachments }));
mock.module('@/modules/pages/links/server/queries/pages.backlinks.queries', () => ({ getPageBacklinks }));
mock.module('@/modules/pages/block-sync/server/lib/block-sync.reading.server', () => ({
  getPageBlocks: async () => ({ getValue: () => [], isFail: () => false, isOk: () => true }),
}));
const getPage = mock(async () => pageResult);
const getPagePath = mock(async () => ({ getValue: () => tree, isOk: () => true }));
mock.module('@/modules/pages/server/queries/pages.queries', () => ({
  getPage,
  getPageComputedValues: async () => ({ isFail: () => true, isOk: () => false }),
  getPageSpaceId: async () => ({ isFail: () => true, isOk: () => false }),
}));
mock.module('@/modules/pages/tree/server/queries/pages.tree.queries', () => ({
  getPageAncestors: async () => ({ getValue: () => [], isOk: () => true }),
  getPagePath,
}));
mock.module('@/modules/pages/tree/server/lib/pages.references.server', () => ({
  getPageReferences: async () => ({ isOk: () => false }),
}));
mock.module('@/modules/pages/collections/server/queries/pages.schema.queries', () => ({
  getPageSchema: async () => ({ getValue: () => ({ pageId, properties: [], spaceId, views: [] }), isOk: () => true }),
  getSpaceCollections: async () => ({ getValue: () => [], isOk: () => true }),
}));
mock.module('@/modules/pages/collections/server/lib/pages.view-reading.server', () => ({
  readPageViewReading: async () => null,
}));
mock.module('@/modules/pages/templates/server/queries/pages.templates.queries', () => ({
  getPageTemplates: async () => ({ isFail: () => true }),
}));
mock.module('@/modules/pages/templates/server/actions/pages.templates.actions', () => ({
  createPageTemplateAction: async () => undefined,
  deletePageTemplateAction: async () => undefined,
  listPageTemplatesAction: async () => undefined,
  setDefaultPageTemplateAction: async () => undefined,
  updatePageTemplateAction: async () => undefined,
}));
// Server actions cannot be loaded in a browser-shaped test.
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  ...COLLECTION_ACTION_STUBS,
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  applyPageViewOperationsAction: async () => ({ data: null }),
  loadMorePageRowsAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageCollectionAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  movePageRowAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
// The live follower opens a socket and loads server actions, which a test of the route does not need.
mock.module('@/modules/pages/collections/components/pages.collection.live-follower', () => ({
  PagesCollectionLiveFollower: () => null,
}));
mock.module('@/modules/pages/collections/components/pages.collection.computed-sources-follower', () => ({
  PagesCollectionComputedSourcesFollower: () => null,
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));
mock.module('@/modules/spaces/server/queries/spaces.queries', () => ({
  getSpaceMembers: async () => ({ getValue: () => [], isOk: () => true }),
  getSpaces,
}));

const { default: Page } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/pages/[pageId]/page');

describe('page detail route attachments', () => {
  it('renders the document when attachment loading fails', async () => {
    const result = await Page({ params: Promise.resolve({ pageId, spaceId }) });

    render(result);

    expect(screen.getByTestId('page-workspace').getAttribute('data-attachment-count')).toBe('0');
  });
});

describe('page detail route reads one page, not the space', () => {
  it('hands the page the names of the pages above it that the reader can open, and the windows of the sidebar', async () => {
    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const rendered = screen.getByTestId('page-workspace');
    expect(rendered.getAttribute('data-ancestor-ids')).toBe('top');
    expect(rendered.getAttribute('data-tree-level-count')).toBe('1');
  });

  /** A page written from outside the portal, by an agent, is found by its address and not by a list. */
  it('opens a page the sidebar does not know yet, instead of saying it does not exist', async () => {
    getPagePath.mockImplementationOnce(async () => ({ getValue: () => null as never, isOk: () => true }));

    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const rendered = screen.getByTestId('page-workspace');
    expect(rendered.getAttribute('data-ancestor-ids')).toBe('');
    expect(rendered.getAttribute('data-tree-level-count')).toBe('none');
  });

  it('says the page does not exist when the reader cannot open it', async () => {
    getPage.mockImplementationOnce(async () => ({
      getValue: () => null as never,
      isFail: () => false,
      isOk: () => true,
    }));

    await expect(Page({ params: Promise.resolve({ pageId, spaceId }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('raises the failure, not a missing page, when the backend could not be asked for the page', async () => {
    getPage.mockImplementationOnce(async () => ({
      getError: () => new Error('Backend unreachable'),
      getValue: () => null as never,
      isFail: () => true,
      isOk: () => false,
    }));

    await expect(Page({ params: Promise.resolve({ pageId, spaceId }) })).rejects.toThrow('Backend unreachable');
  });

  it('raises the failure, not a missing page, when the backend could not be asked for the spaces', async () => {
    const failing = {
      getError: () => new Error('Spaces unreachable'),
      getValue: () => [],
      isFail: () => true,
      isOk: () => false,
    };
    getSpaces.mockImplementationOnce(async () => failing as never);

    await expect(Page({ params: Promise.resolve({ pageId, spaceId }) })).rejects.toThrow('Spaces unreachable');
  });
});
