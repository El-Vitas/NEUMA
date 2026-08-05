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
const trashPage = mock(async () => ({ data: undefined }));

mock.module('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ refresh: refreshRouter }),
}));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  restorePageAction: restorePage,
  trashPageAction: trashPage,
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

  it('keeps trashed pages reachable in the tree instead of hiding them', () => {
    renderSidebarPageTree([trashedPage]);

    expect(screen.getByRole('link', { name: /Trashed page/ })).toBeDefined();
  });

  it('does not offer child creation from a trashed page', () => {
    renderSidebarPageTree([trashedPage]);

    expect(screen.queryByRole('link', { name: 'Create child page' })).toBeNull();
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

  it('offers undo after trashing a page and restores the same page', async () => {
    renderSidebarPageTree([parentPage]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Parent page to the trash' }));

    const undoButton = await screen.findByRole('button', { name: 'Undo' });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(trashPage).toHaveBeenCalledWith({ pageId: 'parent-page', spaceId });
      expect(restorePage).toHaveBeenCalledWith({ pageId: 'parent-page', spaceId });
      expect(refreshRouter).toHaveBeenCalledTimes(2);
    });
  });

  it('does not offer undo after restoring a page from the tree', async () => {
    renderSidebarPageTree([trashedPage]);

    fireEvent.click(screen.getByRole('button', { name: 'Restore Trashed page' }));

    await waitFor(() => {
      expect(restorePage).toHaveBeenCalledWith({ pageId: 'trashed-page', spaceId });
    });

    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });
});
