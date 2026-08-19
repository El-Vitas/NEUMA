import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import en from '../../../../../../messages/en.json';

let pathname = '/spaces/engineering';

const refreshRouter = mock(() => undefined);
const restorePage = mock(async () => ({ data: undefined }));
const movePage = mock(async () => ({ data: undefined }));

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshRouter }),
}));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathname,
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
/** Starting a page reaches a server action, which refuses to load outside a server. */
mock.module('@/modules/pages/hooks/use.pages.start', () => ({
  usePagesStart: () => ({ isStarting: false, startPage: () => undefined }),
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  setPageLockAction: async () => ({ data: undefined }),
  duplicatePageAction: async () => ({ data: undefined }),
  movePageAction: movePage,
  /** The rename dialog reachable from the tree pulls this in, so the stand-in offers it too. */
  renamePageAction: async () => ({ data: undefined }),
  restorePageAction: restorePage,
}));
/** The icon dialog reachable from the tree imports these server actions, which refuse to load outside a server. */
mock.module('@/modules/pages/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));
mock.module('@/modules/pages/components/pages.trash.confirm.dialog', () => ({
  PagesTrashConfirmDialog: ({
    onClose,
    onTrashed,
    page,
  }: {
    readonly onClose: () => void;
    readonly onTrashed?: () => void;
    readonly page: { readonly id: string; readonly title: string } | null;
    readonly spaceId: string;
  }) =>
    page === null ? null : (
      <div>
        <p>{`Trash ${page.title}?`}</p>
        <button onClick={onTrashed} type="button">
          Confirm trash
        </button>
        <button onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    ),
}));
mock.module('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    asChild,
    children,
    onSelect,
  }: {
    readonly asChild?: boolean;
    readonly children: ReactNode;
    readonly onSelect?: () => void;
  }) =>
    asChild ? (
      children
    ) : (
      <button onClick={onSelect} type="button">
        {children}
      </button>
    ),
  DropdownMenuTrigger: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

const { SidebarPageTree } = await import('@/shared/components/portal/sidebar/sidebar-page-tree');

const spaceId = 'engineering';

const parentPage: PortalSidebarPage = {
  id: 'parent-page',
  icon: null,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  title: 'Parent page',
};

const childPage: PortalSidebarPage = {
  id: 'child-page',
  icon: null,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'parent-page',
  title: 'Child page',
};

const siblingPage: PortalSidebarPage = {
  id: 'sibling-page',
  icon: null,
  lifecycle: 'ACTIVE',
  order: 1,
  parentId: null,
  title: 'Sibling page',
};

const trashedPage: PortalSidebarPage = {
  id: 'trashed-page',
  icon: null,
  lifecycle: 'TRASHED',
  order: 2,
  parentId: null,
  title: 'Trashed page',
};

const renderSidebarPageTree = (pages: readonly PortalSidebarPage[], role: 'ADMIN' | 'CLIENT' = 'ADMIN') =>
  render(
    <>
      <Toaster />
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarPageTree id="sidebar-page-tree" pages={pages} role={role} spaceId={spaceId} />
      </NextIntlClientProvider>
    </>,
  );

const createDataTransferStub = () => ({
  dropEffect: '',
  effectAllowed: '',
  getData: () => '',
  setData: () => undefined,
});

const getDraggableRow = (linkName: string): HTMLElement => {
  const link = screen.getByRole('link', { name: linkName });
  const row = link.closest('[draggable]');
  if (row === null) throw new Error(`No draggable row found for "${linkName}"`);
  return row as HTMLElement;
};

describe('SidebarPageTree', () => {
  beforeEach(() => {
    pathname = '/spaces/engineering';
  });

  afterEach(() => {
    mock.clearAllMocks();
    toast.dismiss();
  });

  it('uses a locale-aware page link instead of client-only selection state', () => {
    renderSidebarPageTree([parentPage]);

    expect(screen.getByRole('link', { name: 'Parent page' }).getAttribute('href')).toBe(
      '/spaces/engineering/pages/parent-page',
    );
  });

  it('does not show a page that was sent to the trash, since it is now reachable from /trash instead', () => {
    renderSidebarPageTree([trashedPage]);

    expect(screen.queryByRole('link', { name: /Trashed page/ })).toBeNull();
  });

  it('does not offer page actions to members who cannot edit content', () => {
    renderSidebarPageTree([parentPage], 'CLIENT');

    expect(screen.queryByRole('button', { name: 'Actions for Parent page' })).toBeNull();
  });

  it('expands the ancestor path when the current route selects a nested page', () => {
    pathname = '/spaces/engineering/pages/child-page';
    renderSidebarPageTree([parentPage, childPage]);

    expect(screen.getByRole('button', { name: 'Collapse Parent page' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: 'Child page' }).getAttribute('aria-current')).toBe('page');
  });

  it('moves page-link focus with tree navigation keys without entering page actions', () => {
    renderSidebarPageTree([parentPage, childPage, siblingPage]);

    const parentLink = screen.getByRole('link', { name: 'Parent page' });
    const siblingLink = screen.getByRole('link', { name: 'Sibling page' });
    parentLink.focus();

    fireEvent.keyDown(parentLink, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'Collapse Parent page' }).getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(parentLink, { key: 'ArrowRight' });
    const childLink = screen.getByRole('link', { name: 'Child page' });
    expect(document.activeElement).toBe(childLink);

    fireEvent.keyDown(childLink, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(parentLink);

    fireEvent.keyDown(parentLink, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(childLink);

    fireEvent.keyDown(childLink, { key: 'End' });
    expect(document.activeElement).toBe(siblingLink);

    fireEvent.keyDown(siblingLink, { key: 'Home' });
    expect(document.activeElement).toBe(parentLink);
  });

  it('asks for confirmation before trashing a page, instead of trashing right away', async () => {
    renderSidebarPageTree([parentPage]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Parent page to the trash' }));

    expect(await screen.findByText('Trash Parent page?')).toBeDefined();
    expect(refreshRouter).not.toHaveBeenCalled();
  });

  it('closes the confirmation dialog without trashing when cancelled', async () => {
    renderSidebarPageTree([parentPage]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Parent page to the trash' }));
    expect(await screen.findByText('Trash Parent page?')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Trash Parent page?')).toBeNull();
    });
    expect(refreshRouter).not.toHaveBeenCalled();
  });

  it('offers undo once the dialog confirms the page was trashed, and restores the same page', async () => {
    renderSidebarPageTree([parentPage]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Parent page to the trash' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm trash' }));

    const undoButton = await screen.findByRole('button', { name: 'Undo' });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(restorePage).toHaveBeenCalledWith({ pageId: 'parent-page', spaceId });
      expect(refreshRouter).toHaveBeenCalledTimes(2);
    });
  });

  it('announces the page being dragged as soon as the drag starts', () => {
    renderSidebarPageTree([parentPage, siblingPage]);

    fireEvent.dragStart(getDraggableRow('Sibling page'), { dataTransfer: createDataTransferStub() });

    expect(screen.getByText('Moving Sibling page')).toBeDefined();
  });

  it('nests a dragged page inside the page it is dropped on, and reports the move', async () => {
    renderSidebarPageTree([parentPage, siblingPage]);

    const draggedRow = getDraggableRow('Sibling page');
    const targetRow = getDraggableRow('Parent page');

    fireEvent.dragStart(draggedRow, { dataTransfer: createDataTransferStub() });
    fireEvent.dragOver(targetRow, { dataTransfer: createDataTransferStub() });
    expect(screen.getByText('Will drop inside Parent page')).toBeDefined();

    fireEvent.drop(targetRow, { dataTransfer: createDataTransferStub() });

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({ pageId: 'sibling-page', parentId: 'parent-page', spaceId });
      expect(refreshRouter).toHaveBeenCalled();
    });
  });

  it('refuses to drop a page inside its own descendant', async () => {
    pathname = '/spaces/engineering/pages/child-page';
    renderSidebarPageTree([parentPage, childPage]);

    const draggedRow = getDraggableRow('Parent page');
    const targetRow = getDraggableRow('Child page');

    fireEvent.dragStart(draggedRow, { dataTransfer: createDataTransferStub() });
    fireEvent.dragOver(targetRow, { dataTransfer: createDataTransferStub() });
    expect(screen.getByText("Can't drop here")).toBeDefined();

    fireEvent.drop(targetRow, { dataTransfer: createDataTransferStub() });

    expect(movePage).not.toHaveBeenCalled();
  });

  it('offers a space-root drop zone while dragging, and reports it does not promise a sibling position', async () => {
    pathname = '/spaces/engineering/pages/child-page';
    renderSidebarPageTree([parentPage, childPage]);

    expect(screen.queryByText('Space root')).toBeNull();

    fireEvent.dragStart(getDraggableRow('Child page'), { dataTransfer: createDataTransferStub() });
    const rootZone = screen.getByText('Space root');

    fireEvent.dragOver(rootZone, { dataTransfer: createDataTransferStub() });
    expect(screen.getByText('Will drop inside Space root')).toBeDefined();

    fireEvent.drop(rootZone, { dataTransfer: createDataTransferStub() });

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({ pageId: 'child-page', parentId: null, spaceId });
    });
  });

  it('does not offer a "drop before" or "drop after" a sibling, since the backend cannot keep that placement', () => {
    renderSidebarPageTree([parentPage, siblingPage]);

    fireEvent.dragStart(getDraggableRow('Sibling page'), { dataTransfer: createDataTransferStub() });
    fireEvent.dragOver(getDraggableRow('Parent page'), { dataTransfer: createDataTransferStub() });

    expect(screen.queryByText(/Will drop before/)).toBeNull();
    expect(screen.queryByText(/Will drop after/)).toBeNull();
  });

  it('nests a page under its previous sibling with the keyboard, without a mouse', async () => {
    renderSidebarPageTree([parentPage, siblingPage]);

    fireEvent.keyDown(screen.getByRole('link', { name: 'Sibling page' }), { altKey: true, key: 'ArrowRight' });

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({ pageId: 'sibling-page', parentId: 'parent-page', spaceId });
    });
  });

  it('climbs a nested page out to its parent level with the keyboard', async () => {
    pathname = '/spaces/engineering/pages/child-page';
    renderSidebarPageTree([parentPage, childPage]);

    fireEvent.keyDown(screen.getByRole('link', { name: 'Child page' }), { altKey: true, key: 'ArrowLeft' });

    await waitFor(() => {
      expect(movePage).toHaveBeenCalledWith({ pageId: 'child-page', parentId: null, spaceId });
    });
  });
});
