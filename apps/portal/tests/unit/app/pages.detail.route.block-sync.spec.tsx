import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { documentOf, paragraph, syncedBlocksOf, text } from '../modules/pages/block-sync/block-sync.fixtures';

const pageId = '44444444-4444-4444-8444-444444444444';
const spaceId = '22222222-2222-4222-8222-222222222222';
const emptyList = { getError: () => new Error('none'), getValue: () => [], isFail: () => true, isOk: () => false };
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
const writtenInBlocks = documentOf(paragraph('p1', text('From the blocks')));
const blockRows = syncedBlocksOf(writtenInBlocks, 1, pageId);
const blocksOutcome = (isOk: boolean, rows: readonly unknown[] = blockRows) => ({
  getValue: () => rows,
  isFail: () => !isOk,
  isOk: () => isOk,
});
const getPageBlocks = mock(async () => blocksOutcome(true));
const workspace = mock(
  (props: {
    readonly blockSync?: readonly unknown[] | null;
    readonly blockSyncFailed?: boolean;
    readonly currentUserId?: string;
    readonly pages: readonly { readonly content: unknown; readonly id: string }[];
  }) =>
    createElement('div', {
      'data-block-count': props.blockSync?.length ?? 'none',
      'data-content': JSON.stringify(props.pages.find((page) => page.id === pageId)?.content),
      'data-block-failed': String(props.blockSyncFailed ?? false),
      'data-testid': 'page-workspace',
      'data-user-id': props.currentUserId ?? 'none',
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
mock.module('@/shared/server/lib/current-user.server', () => ({
  getCurrentUser: async () => ({ id: 'user-1', name: 'Ana', role: 'ADMIN' }),
}));
mock.module('@/modules/favorites/server/queries/favorites.queries', () => ({
  getFavoritePages: async () => ({ getValue: () => [], isOk: () => true }),
}));
mock.module('@/modules/pages/components/pages.workspace', () => ({ PagesWorkspace: workspace }));
mock.module('@/modules/pages/attachments/server/queries/pages.attachments.queries', () => ({
  getPageAttachments: async () => emptyList,
}));
mock.module('@/modules/pages/links/server/queries/pages.backlinks.queries', () => ({
  getPageBacklinks: async () => emptyList,
}));
mock.module('@/modules/pages/block-sync/server/lib/block-sync.reading.server', () => ({ getPageBlocks }));
mock.module('@/modules/pages/server/queries/pages.queries', () => ({
  getPages: async () => pagesResult,
  getPagesHolding: async () => pagesResult,
  getPageSpaceId: async () => ({ isFail: () => true, isOk: () => false }),
}));
mock.module('@/modules/pages/collections/server/queries/pages.schema.queries', () => ({
  getPageSchema: async () => ({ getValue: () => ({ pageId, properties: [], spaceId, views: [] }), isOk: () => true }),
  getPageView: async () => ({ getValue: () => ({ kind: 'FLAT_ROWS', rows: [] }), isOk: () => true }),
}));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageViewConfigurationAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
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
  getSpaces: async () => ({ getValue: () => [{ id: spaceId, name: 'Engineering' }], isOk: () => true }),
}));

// The flag is read once, when the config loads.
process.env.NEXT_PUBLIC_BLOCK_EDITOR = 'true';
const { default: Page } = await import('@/app/[locale]/(portal)/spaces/[spaceId]/pages/[pageId]/page');
delete process.env.NEXT_PUBLIC_BLOCK_EDITOR;

describe('page detail route with the block editor on', () => {
  it('reads the blocks with the page and hands them down with the user', async () => {
    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const rendered = screen.getByTestId('page-workspace');
    expect(getPageBlocks).toHaveBeenCalledWith(pageId);
    expect(rendered.getAttribute('data-block-count')).toBe(String(blockRows.length));
    expect(rendered.getAttribute('data-block-failed')).toBe('false');
    expect(rendered.getAttribute('data-user-id')).toBe('user-1');
  });

  it('starts the editor from the blocks, not from the content the page was stored with', async () => {
    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const content = screen.getByTestId('page-workspace').getAttribute('data-content');
    expect(content).toContain('From the blocks');
    expect(content).not.toContain('"content":[]');
  });

  it('says the blocks failed when they do not make a document', async () => {
    getPageBlocks.mockImplementationOnce(async () => blocksOutcome(true, [blockRows[0]]));

    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const rendered = screen.getByTestId('page-workspace');
    expect(rendered.getAttribute('data-block-count')).toBe('none');
    expect(rendered.getAttribute('data-block-failed')).toBe('true');
  });

  it('says the blocks failed instead of falling back to another editor', async () => {
    getPageBlocks.mockImplementationOnce(async () => blocksOutcome(false));

    render(await Page({ params: Promise.resolve({ pageId, spaceId }) }));

    const rendered = screen.getByTestId('page-workspace');
    expect(rendered.getAttribute('data-block-count')).toBe('none');
    expect(rendered.getAttribute('data-block-failed')).toBe('true');
  });
});
