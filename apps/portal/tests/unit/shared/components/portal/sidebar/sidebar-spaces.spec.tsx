import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import type { PageTreeStore } from '@/modules/pages/tree/types/pages.tree.types';
import type { PortalLayoutSpace, PortalSidebarPage } from '@/modules/portal/types/portal.types';
import en from '../../../../../../messages/en.json';

let pathname = '/spaces/engineering/pages/architecture';

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { readonly children: ReactNode; readonly href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathname,
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

/** Starting a page reaches a server action, which refuses to load outside a server. */
mock.module('@/shared/hooks/use.pages-start.hook', () => ({
  usePagesStart: () => ({ isStarting: false, startPage: () => undefined }),
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  // Pulled in by the rename dialog under the space tree.
  duplicatePageAction: mock(async () => ({ data: undefined })),
  // Pulled in by the batch move dialog to list destinations.
  listPageMoveDestinationsAction: async () => ({ data: { pages: [], spaces: [] } }),
  movePageAction: mock(async () => ({ data: undefined })),
  renamePageAction: mock(async () => ({ data: undefined })),
  reorderPageAction: mock(async () => ({ data: undefined })),
  restorePageAction: mock(async () => ({ data: undefined })),
}));
/** The export entries in the menus reach the server; the sidebar only needs them to exist. */
mock.module('@/modules/pages/export/server/actions/pages.export.actions', () => ({
  exportPagesAsMarkdownAction: mock(async () => ({ data: '' })),
}));
/** Selection mode reaches these server actions, which refuse to load outside a server. */
mock.module('@/modules/portal/server/actions/portal.sidebar.selection.actions', () => ({
  batchMovePagesAction: async () => ({ data: { failedIds: [], succeededIds: [] } }),
  batchTrashPagesAction: async () => ({ data: { failedIds: [], succeededIds: [] } }),
}));

/** The icon and rename dialogs import server actions, which refuse to load outside a server. */
mock.module('@/modules/pages/appearance/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/spaces/server/actions/spaces.icon.actions', () => ({
  removeSpaceIconAction: async () => ({ data: undefined }),
  setSpaceIconEmojiAction: async () => ({ data: undefined }),
  setSpaceIconSymbolAction: async () => ({ data: undefined }),
}));

mock.module('@/modules/spaces/server/actions/spaces.actions', () => ({
  createSpaceAction: async () => ({ data: undefined }),
  renameSpaceAction: async () => ({ data: undefined }),
  reorderSpaceAction: async () => ({ data: [] }),
}));

mock.module('@/modules/pages/trash/components/pages.trash.confirm.dialog', () => ({
  PagesTrashConfirmDialog: () => null,
}));

const { SidebarSpaces } = await import('@/shared/components/portal/sidebar/sidebar-spaces');
const { createPageTreeStore } = await import('@/modules/pages/tree/lib/pages.tree.store.lib');
const { PagesTreeStoreStub, seedPageTreeSpace } = await import('../../../../modules/pages/stubs/pages.tree.stubs');

const space: PortalLayoutSpace = {
  icon: null,
  id: 'engineering',
  kind: 'own',
  name: 'Engineering',
};

const trashedOnlySpace: PortalLayoutSpace = {
  icon: null,
  id: 'archive',
  kind: 'own',
  name: 'Archive',
};

const emptySpace: PortalLayoutSpace = {
  icon: null,
  id: 'empty-space',
  kind: 'own',
  name: 'Empty space',
};

/** What each space holds once the sidebar has loaded it. A space in the trash only holds nothing the sidebar shows. */
const pagesBySpace: Readonly<Record<string, readonly PortalSidebarPage[]>> = {
  archive: [
    {
      canEdit: true,
      id: 'old-handbook',
      icon: null,
      lifecycle: 'TRASHED',
      order: 0,
      parentId: null,
      title: 'Old handbook',
    },
  ],
  engineering: [
    { canEdit: true, id: 'handbook', icon: null, lifecycle: 'ACTIVE', order: 0, parentId: null, title: 'Handbook' },
    {
      canEdit: true,
      id: 'architecture',
      icon: null,
      lifecycle: 'ACTIVE',
      order: 0,
      parentId: 'handbook',
      title: 'Architecture',
    },
  ],
};

const buildStoreFor = (spaces: readonly PortalLayoutSpace[]): PageTreeStore => {
  const store = createPageTreeStore({ readWindows: () => Promise.resolve(null) });
  for (const { id } of spaces) seedPageTreeSpace(store, id, pagesBySpace[id] ?? []);
  return store;
};

const renderSidebarSpaces = (role: 'ADMIN' | 'CLIENT' = 'ADMIN', spaces: readonly PortalLayoutSpace[] = [space]) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesTreeStoreStub store={buildStoreFor(spaces)}>
        <SidebarSpaces collapsed={false} role={role} spaces={spaces} />
      </PagesTreeStoreStub>
    </NextIntlClientProvider>,
  );

describe('SidebarSpaces', () => {
  beforeEach(() => {
    pathname = '/spaces/engineering/pages/architecture';
  });

  it('keeps what somebody else opened up under a heading of its own', () => {
    const sharedSpace: PortalLayoutSpace = { ...emptySpace, id: 'her-notes', kind: 'shared', name: 'Her notes' };

    renderSidebarSpaces('ADMIN', [space, sharedSpace]);

    expect(screen.getByRole('heading', { name: 'Shared with you' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Her notes/ })).toBeDefined();
  });

  it('says nothing about sharing when nobody has shared anything', () => {
    renderSidebarSpaces('ADMIN', [space]);

    expect(screen.queryByRole('heading', { name: 'Shared with you' })).toBeNull();
  });

  it('shows the active space page hierarchy without requiring the pages screen', () => {
    renderSidebarSpaces();

    const spaceLink = screen.getByRole('link', { name: 'Engineering' });
    expect(spaceLink.getAttribute('href')).toBe('/spaces/engineering');
    expect(spaceLink.getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Architecture' }).getAttribute('href')).toBe(
      '/spaces/engineering/pages/architecture',
    );
    expect(screen.getByRole('link', { name: 'Architecture' }).getAttribute('aria-current')).toBe('page');
  });

  it('keeps the parent tree accessible and collapsible', () => {
    renderSidebarSpaces();

    const disclosure = screen.getByRole('button', { name: 'Collapse Handbook' });
    fireEvent.click(disclosure);

    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: 'Architecture' })).toBeNull();
  });

  it('offers contextual page creation only to members who can edit content', () => {
    const { unmount } = renderSidebarSpaces();
    expect(screen.getByRole('button', { name: 'Create a page' })).toBeTruthy();
    unmount();

    pathname = '/spaces/engineering';
    const { unmount: unmountViewer } = renderSidebarSpaces('CLIENT');
    expect(screen.queryByRole('button', { name: 'Create a page' })).toBeNull();
    unmountViewer();
  });

  it('does not offer a disclosure toggle for a space whose only pages are in the trash', () => {
    pathname = '/spaces/archive';
    renderSidebarSpaces('ADMIN', [trashedOnlySpace]);

    expect(screen.queryByRole('button', { name: 'Collapse Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Archive' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Old handbook/ })).toBeNull();
  });

  it('does not offer a disclosure toggle for a space that genuinely has no pages', () => {
    pathname = '/spaces/empty-space';
    renderSidebarSpaces('ADMIN', [emptySpace]);

    expect(screen.queryByRole('button', { name: 'Collapse Empty space' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Expand Empty space' })).toBeNull();
  });

  it('leaves the whole sidebar as the only thing that folds away', () => {
    renderSidebarSpaces();

    expect(screen.queryByRole('button', { name: 'Hide tree' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show tree' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Engineering' })).toBeTruthy();
  });
});
