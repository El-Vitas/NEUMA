import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const attachment = {
  id: '44444444-4444-4444-8444-444444444444',
  mimeType: 'application/pdf',
  originalFilename: 'handbook.pdf',
  size: 1024,
};

mock.module('@/modules/pages/components/pages.editor', () => ({
  PagesEditor: ({
    attachments,
    pageId,
  }: {
    readonly attachments: readonly (typeof attachment)[];
    readonly pageId: string | null;
  }) => (
    <div data-attachment-count={attachments.length} data-page-id={pageId ?? 'new-page'} data-testid="selected-page" />
  ),
}));
mock.module('@/modules/pages/components/pages.tree', () => ({
  PagesTree: () => <div />,
}));

const { PagesWorkspace } = await import('@/modules/pages/components/pages.workspace');

describe('PagesWorkspace collaboration propagation', () => {
  it('passes the server-selected page and attachments to the editor', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          attachments={[attachment]}
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
          selectedPageId="22222222-2222-4222-8222-222222222222"
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('selected-page').getAttribute('data-page-id')).toBe(
      '22222222-2222-4222-8222-222222222222',
    );
    expect(screen.getByTestId('selected-page').getAttribute('data-attachment-count')).toBe('1');
  });

  it('does not render an editor when the route has no selected page', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          canEditContent
          pages={[]}
          selectedPageId={null}
          spaceId="33333333-333333333333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByTestId('selected-page')).toBeNull();
  });

  it('renders an editor for the explicit new-page route', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          canEditContent
          isNewPage
          pages={[]}
          selectedPageId={null}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('selected-page').getAttribute('data-page-id')).toBe('new-page');
  });
});
