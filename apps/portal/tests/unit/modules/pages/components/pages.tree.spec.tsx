import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import en from '../../../../../messages/en.json';

mock.module('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  restorePageAction: async () => ({ data: undefined }),
  trashPageAction: async () => ({ data: undefined }),
}));

const { PagesTree } = await import('@/modules/pages/components/pages.tree');

describe('PagesTree navigation', () => {
  it('uses a locale-aware page link instead of client-only selection state', () => {
    render(
      <NextIntlClientProvider locale="es" messages={en}>
        <PagesTree
          canEdit={false}
          selectedPageId={null}
          spaceId="33333333-3333-4333-8333-333333333333"
          tree={[
            {
              children: [],
              page: {
                content: { content: [], schemaVersion: 1, type: 'doc' },
                id: '22222222-2222-4222-8222-222222222222',
                lifecycle: 'ACTIVE',
                order: 0,
                parentId: null,
                spaceId: '33333333-3333-4333-8333-333333333333',
                title: 'Saved page',
                version: 1,
              },
            },
          ]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: 'Saved page' }).getAttribute('href')).toBe(
      '/spaces/33333333-3333-4333-8333-333333333333/pages/22222222-2222-4222-8222-222222222222',
    );
  });
});
