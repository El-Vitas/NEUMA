import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import type { PortalLayoutSpace } from '@/modules/portal/types/portal.types';
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
}));

mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  restorePageAction: mock(async () => ({ data: undefined })),
}));

mock.module('@/modules/pages/components/pages.trash.confirm.dialog', () => ({
  PagesTrashConfirmDialog: () => null,
}));

const { SidebarSpaces } = await import('@/shared/components/portal/sidebar/sidebar-spaces');

const space: PortalLayoutSpace = {
  id: 'engineering',
  name: 'Engineering',
  pages: [
    {
      id: 'handbook',
      lifecycle: 'ACTIVE' as const,
      order: 0,
      parentId: null,
      title: 'Handbook',
    },
    {
      id: 'architecture',
      lifecycle: 'ACTIVE' as const,
      order: 0,
      parentId: 'handbook',
      title: 'Architecture',
    },
  ],
};

const trashedOnlySpace: PortalLayoutSpace = {
  id: 'archive',
  name: 'Archive',
  pages: [
    {
      id: 'old-handbook',
      lifecycle: 'TRASHED' as const,
      order: 0,
      parentId: null,
      title: 'Old handbook',
    },
  ],
};

const emptySpace: PortalLayoutSpace = {
  id: 'empty-space',
  name: 'Empty space',
  pages: [],
};

const renderSidebarSpaces = (role: 'ADMIN' | 'CLIENT' = 'ADMIN', spaces: readonly PortalLayoutSpace[] = [space]) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SidebarSpaces collapsed={false} role={role} spaces={spaces} />
    </NextIntlClientProvider>,
  );

describe('SidebarSpaces', () => {
  beforeEach(() => {
    pathname = '/spaces/engineering/pages/architecture';
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
    expect(screen.getByRole('link', { name: 'Create a page' }).getAttribute('href')).toBe(
      '/spaces/engineering/pages/new',
    );
    unmount();

    pathname = '/spaces/engineering';
    const { unmount: unmountViewer } = renderSidebarSpaces('CLIENT');
    expect(screen.queryByRole('link', { name: 'Create a page' })).toBeNull();
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
});
