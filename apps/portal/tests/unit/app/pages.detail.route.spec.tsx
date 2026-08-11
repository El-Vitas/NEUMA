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
}));
mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) =>
    createElement('a', { href }, children),
}));
mock.module('@/modules/auth/server/lib/get.current.user.server', () => ({ getCurrentUser: currentUser }));
mock.module('@/modules/pages/components/pages.workspace', () => ({ PagesWorkspace: workspace }));
mock.module('@/modules/pages/server/queries/pages.attachments.queries', () => ({ getPageAttachments }));
mock.module('@/modules/pages/server/queries/pages.backlinks.queries', () => ({ getPageBacklinks }));
mock.module('@/modules/pages/server/queries/pages.queries', () => ({ getPages: async () => pagesResult }));
mock.module('@/modules/pages/server/queries/pages.schema.queries', () => ({
  getPageSchema: async () => ({ getValue: () => ({ pageId, properties: [], spaceId, views: [] }), isOk: () => true }),
  getPageView: async () => ({ getValue: () => ({ kind: 'TABLE_ROWS', rows: [] }), isOk: () => true }),
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
