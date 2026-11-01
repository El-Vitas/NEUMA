import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { PagesSidePanelBundle } from '@/modules/pages/navigation/types/pages.side-panel.types';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import en from '../../../../../messages/en.json';

const attachment = {
  id: '44444444-4444-4444-8444-444444444444',
  mimeType: 'application/pdf',
  originalFilename: 'handbook.pdf',
  size: 1024,
  uploadedBy: 'Jane Doe',
};

mock.module('@/modules/pages/editor/components/pages.editor', () => ({
  PagesEditor: ({
    ancestors,
    attachments,
    blockSync,
    canEdit,
    currentUserId,
    isBlockSyncUnavailable,
    page,
    references,
  }: {
    readonly ancestors: readonly { readonly id: string }[];
    readonly attachments: readonly (typeof attachment)[];
    readonly blockSync?: readonly unknown[] | null;
    readonly canEdit: boolean;
    readonly currentUserId?: string;
    readonly isBlockSyncUnavailable?: boolean;
    readonly page: { readonly id: string };
    readonly references: readonly { readonly id: string }[];
  }) => (
    <div
      data-attachment-count={attachments.length}
      data-block-count={blockSync?.length ?? 'none'}
      data-block-unavailable={String(isBlockSyncUnavailable ?? false)}
      data-can-edit={String(canEdit)}
      data-page-id={page.id}
      data-parent-page-ids={ancestors.map((candidate) => candidate.id).join(',')}
      data-reference-ids={references.map((candidate) => candidate.id).join(',')}
      data-testid="selected-page"
      data-user-id={currentUserId ?? 'none'}
    />
  ),
}));

mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
mock.module('@/i18n/navigation', () => ({
  usePathname: () => '/spaces/s/pages/p',
  useRouter: () => ({ push: () => undefined, refresh: () => undefined, replace: () => undefined }),
}));

const { PagesWorkspace } = await import('@/modules/pages/components/pages.workspace');

const handbook: PageSummary = {
  canEdit: true,
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
};

const panelPage: PageSummary = { ...handbook, id: '55555555-5555-4555-8555-555555555555', title: 'Panel page' };

const buildPanelBundle = (overrides: Partial<PagesSidePanelBundle> = {}): PagesSidePanelBundle => ({
  ancestors: [],
  attachments: [],
  backlinks: { count: 0, items: [] },
  blockSync: [],
  blockSyncFailed: false,
  collectionSection: null,
  embeddedCollections: {},
  isFavorite: false,
  page: panelPage,
  parentSchema: null,
  personOptions: [],
  references: [],
  relatedRows: [],
  syncedSources: [],
  ...overrides,
});

const renderWorkspace = (props: Partial<Parameters<typeof PagesWorkspace>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesWorkspace ancestors={[]} page={handbook} spaceId={handbook.spaceId} {...props} />
    </NextIntlClientProvider>,
  );

describe('PagesWorkspace collaboration propagation', () => {
  it('passes the server-selected page, its attachments and its ancestors to the editor', () => {
    renderWorkspace({
      ancestors: [{ id: '66666666-6666-4666-8666-666666666666', title: 'Parent' }],
      attachments: [attachment],
      page: { ...handbook, id: '22222222-2222-4222-8222-222222222222', title: 'Saved page' },
    });

    const editor = screen.getByTestId('selected-page');
    expect(editor.getAttribute('data-page-id')).toBe('22222222-2222-4222-8222-222222222222');
    expect(editor.getAttribute('data-attachment-count')).toBe('1');
    expect(editor.getAttribute('data-parent-page-ids')).toBe('66666666-6666-4666-8666-666666666666');
  });

  it('hands the editor the pages the page names, so a mention does not wait for a list of the space', () => {
    renderWorkspace({
      references: [
        { id: '77777777-7777-4777-8777-777777777777', lifecycle: 'ACTIVE', spaceId: handbook.spaceId, title: 'Named' },
      ],
    });

    expect(screen.getByTestId('selected-page').getAttribute('data-reference-ids')).toBe(
      '77777777-7777-4777-8777-777777777777',
    );
  });

  it('hands the blocks and the user to the editor', () => {
    renderWorkspace({ blockSync: [], currentUserId: 'user-1' });

    const editor = screen.getByTestId('selected-page');
    expect(editor.getAttribute('data-block-count')).toBe('0');
    expect(editor.getAttribute('data-user-id')).toBe('user-1');
    expect(editor.getAttribute('data-can-edit')).toBe('true');
  });

  it('makes the page read-only when the viewer holds only a reader role on it, whatever the workspace role', () => {
    renderWorkspace({ blockSync: [], page: { ...handbook, canEdit: false } });

    expect(screen.getByTestId('selected-page').getAttribute('data-can-edit')).toBe('false');
  });

  it('makes the side panel page read-only when the viewer holds only a reader role on it', () => {
    renderWorkspace({
      blockSync: [],
      panelBundle: buildPanelBundle({ page: { ...panelPage, canEdit: false } }),
    });

    const panelEditor = screen
      .getAllByTestId('selected-page')
      .find((editor) => editor.getAttribute('data-page-id') === panelPage.id);
    expect(panelEditor?.getAttribute('data-can-edit')).toBe('false');
  });

  it('makes the page read-only, and says why, when its blocks could not be read', () => {
    renderWorkspace({ blockSyncFailed: true });

    const editor = screen.getByTestId('selected-page');
    expect(editor.getAttribute('data-can-edit')).toBe('false');
    expect(editor.getAttribute('data-block-unavailable')).toBe('true');
  });

  it('hands the side panel editor its own page blocks and the user, like the main editor', () => {
    renderWorkspace({ blockSync: [], currentUserId: 'user-1', panelBundle: buildPanelBundle() });

    const panelEditor = screen
      .getAllByTestId('selected-page')
      .find((editor) => editor.getAttribute('data-page-id') === panelPage.id);
    expect(panelEditor?.getAttribute('data-block-count')).toBe('0');
    expect(panelEditor?.getAttribute('data-user-id')).toBe('user-1');
    expect(panelEditor?.getAttribute('data-can-edit')).toBe('true');
  });

  it('makes the side panel page read-only, and says why, when its blocks could not be read', () => {
    renderWorkspace({ blockSync: [], panelBundle: buildPanelBundle({ blockSync: null, blockSyncFailed: true }) });

    const panelEditor = screen
      .getAllByTestId('selected-page')
      .find((editor) => editor.getAttribute('data-page-id') === panelPage.id);
    expect(panelEditor?.getAttribute('data-can-edit')).toBe('false');
    expect(panelEditor?.getAttribute('data-block-unavailable')).toBe('true');
  });

  it('renders the document as the only content, without a duplicated page tree column', () => {
    const { container } = renderWorkspace({ attachments: [attachment] });

    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('nav')).toBeNull();
    expect(container.firstElementChild).toBe(screen.getByTestId('selected-page'));
  });
});
