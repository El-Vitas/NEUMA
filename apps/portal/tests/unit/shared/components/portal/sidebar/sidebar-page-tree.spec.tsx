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
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  restorePageAction: restorePage,
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
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: null,
  title: 'Parent page',
};

const childPage: PortalSidebarPage = {
  id: 'child-page',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'parent-page',
  title: 'Child page',
};

const siblingPage: PortalSidebarPage = {
  id: 'sibling-page',
  lifecycle: 'ACTIVE',
  order: 1,
  parentId: null,
  title: 'Sibling page',
};

const trashedPage: PortalSidebarPage = {
  id: 'trashed-page',
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
});
