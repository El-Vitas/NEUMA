import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const attachment = {
  id: '44444444-4444-4444-8444-444444444444',
  mimeType: 'application/pdf',
  originalFilename: 'handbook.pdf',
  size: 1024,
  uploadedBy: 'Jane Doe',
};

mock.module('@/modules/pages/components/pages.editor', () => ({
  PagesEditor: ({
    attachments,
    page,
    parentBreadcrumbPages,
  }: {
    readonly attachments: readonly (typeof attachment)[];
    readonly page: { readonly id: string };
    readonly parentBreadcrumbPages: readonly { readonly id: string }[];
  }) => (
    <div
      data-attachment-count={attachments.length}
      data-page-id={page.id}
      data-parent-page-ids={parentBreadcrumbPages.map((candidate) => candidate.id).join(',')}
      data-testid="selected-page"
    />
  ),
}));

/** Starting a page reaches a server action, which refuses to load outside a server. */
mock.module('@/shared/components/portal/start-page-button', () => ({
  StartPageButton: ({ label }: { readonly label: string }) => <button type="button">{label}</button>,
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
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              createdBy: null,
              id: '11111111-1111-4111-8111-111111111111',
              lifecycle: 'ACTIVE',
              order: 0,
              parentId: null,
              propertyValues: null,
              spaceId: '33333333-3333-4333-8333-333333333333',
              title: 'Handbook',
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedBy: null,
              version: 1,
            },
            {
              content: { content: [], schemaVersion: 1, type: 'doc' },
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              createdBy: null,
              id: '22222222-2222-4222-8222-222222222222',
              lifecycle: 'ACTIVE',
              order: 0,
              parentId: '11111111-1111-4111-8111-111111111111',
              propertyValues: null,
              spaceId: '33333333-3333-4333-8333-333333333333',
              title: 'Saved page',
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedBy: null,
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
    expect(screen.getByTestId('selected-page').getAttribute('data-parent-page-ids')).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });

  /** There is no route for a page that does not exist yet: a page is made first and written in afterwards. */
  it('offers to start a page instead of an editor over nothing', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          canEditContent
          pages={[]}
          selectedPageId={null}
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByTestId('selected-page')).toBeNull();
    expect(screen.getByRole('button', { name: en.pages.createPage })).toBeDefined();
  });

  it('renders the document as the only content, without a duplicated page tree column', () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesWorkspace
          attachments={[attachment]}
          canEditContent
          pages={[
            {
              content: { content: [], schemaVersion: 1, type: 'doc' },
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              createdBy: null,
              id: '11111111-1111-4111-8111-111111111111',
              lifecycle: 'ACTIVE',
              order: 0,
              parentId: null,
              propertyValues: null,
              spaceId: '33333333-3333-4333-8333-333333333333',
              title: 'Handbook',
              updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedBy: null,
              version: 1,
            },
          ]}
          selectedPageId="11111111-1111-4111-8111-111111111111"
          spaceId="33333333-3333-4333-8333-333333333333"
        />
      </NextIntlClientProvider>,
    );

    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
    expect(container.firstElementChild).toBe(screen.getByTestId('selected-page'));
  });
});
