import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

mock.module('@/modules/pages/components/pages.editor', () => ({
  PagesEditor: ({ pageId }: { readonly pageId: string | null }) => (
    <div data-page-id={pageId ?? 'new-page'} data-testid="selected-page" />
  ),
}));
mock.module('@/modules/pages/components/pages.tree', () => ({
  PagesTree: () => <div />,
}));

const { PagesWorkspace } = await import('@/modules/pages/components/pages.workspace');

describe('PagesWorkspace collaboration propagation', () => {
  it('passes the selected saved page id to the editor', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          canEditContent
          pages={[
            {
              content: { content: [], schemaVersion: 1, type: 'doc' },
              id: '22222222-2222-4222-8222-222222222222',
              lifecycle: 'ACTIVE',
              order: 0,
              parentId: null,
              spaceId: '33333333-3333-4333-8333-333333333333',
              title: 'Saved page',
              version: 1,
            },
          ]}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('selected-page').getAttribute('data-page-id')).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('passes no page id when the workspace has no saved page', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace canEditContent pages={[]} spaceId="33333333-3333-4333-8333-333333333333" />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('selected-page').getAttribute('data-page-id')).toBe('new-page');
  });
});
