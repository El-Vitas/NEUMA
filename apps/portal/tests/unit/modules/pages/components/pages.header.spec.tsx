import { describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PAGE_APPEARANCE_DEFAULT_PREFERENCES } from '@/modules/pages/appearance/constants/pages.appearance.constants';
import type { PagesAppearanceResult } from '@/modules/pages/appearance/types/pages.appearance.types';
import type { PageSummary } from '@/modules/pages/types/pages.types';
import { APP_TIME_ZONE } from '@/shared/constants/date.constants';
import en from '../../../../../messages/en.json';

mock.module('server-only', () => ({}));
mock.module('next/navigation', () => ({
  permanentRedirect: () => undefined,
  redirect: () => undefined,
  unstable_rethrow: () => undefined,
  usePathname: () => '/',
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
mock.module('@/modules/pages/appearance/server/actions/pages.icon.actions', () => ({
  removePageIconAction: async () => ({ data: undefined }),
  setPageIconEmojiAction: async () => ({ data: undefined }),
  setPageIconSymbolAction: async () => ({ data: undefined }),
  uploadPageIconImageAction: async () => ({ data: undefined }),
}));

mock.module('@/shared/components/portal/page-favorite-toggle', () => ({
  PageFavoriteToggle: ({
    isFavorite,
    pageId,
  }: {
    readonly isFavorite: boolean;
    readonly pageId: string;
    readonly spaceId: string;
    readonly title: string;
  }) => (
    <button aria-label={`favorite:${pageId}:${String(isFavorite)}`} type="button">
      favorite
    </button>
  ),
}));

mock.module('@/shared/components/portal/recents-recorder', () => ({
  RecentPageRecorder: ({
    pageId,
    spaceName,
  }: {
    readonly pageId: string;
    readonly spaceId: string;
    readonly spaceName: string;
    readonly title: string;
  }) => <div data-testid={`recent-recorder:${pageId}:${spaceName}`} />,
}));

const { PagesHeader } = await import('@/modules/pages/appearance/components/pages.header');

const PARENT_PAGES: readonly PageSummary[] = [
  {
    canEdit: true,
    content: { content: [], schemaVersion: 1, type: 'doc' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: null,
    id: '22222222-2222-4222-8222-222222222222',
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
];

const buildAppearance = (overrides: Partial<PagesAppearanceResult> = {}): PagesAppearanceResult => ({
  preferences: PAGE_APPEARANCE_DEFAULT_PREFERENCES,
  setTextSize: () => undefined,
  setTypography: () => undefined,
  ...overrides,
});

const renderHeader = (props: Partial<Parameters<typeof PagesHeader>[0]> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone={APP_TIME_ZONE}>
      <PagesHeader
        appearance={buildAppearance()}
        canEdit
        displayState="saved"
        onTitleChange={() => undefined}
        parentPages={PARENT_PAGES}
        savedAt={null}
        spaceId="33333333-3333-4333-8333-333333333333"
        title="Policies"
        titleInputRef={{ current: null }}
        {...props}
      />
    </NextIntlClientProvider>,
  );

describe('PagesHeader', () => {
  it('renders the space, parent path, current page, and when it finished saving', () => {
    const savedAt = new Date('2026-08-15T14:32:00Z');
    renderHeader({ savedAt });

    expect(screen.getByRole('navigation', { name: 'Location' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Space root' }).getAttribute('href')).toBe(
      '/spaces/33333333-3333-4333-8333-333333333333',
    );
    expect(screen.getByRole('link', { name: 'Handbook' }).getAttribute('href')).toBe(
      '/spaces/33333333-3333-4333-8333-333333333333/pages/22222222-2222-4222-8222-222222222222',
    );
    expect(screen.getByTitle('Policies').closest('[aria-current="page"]')).not.toBeNull();

    const expectedTime = new Intl.DateTimeFormat('en', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: APP_TIME_ZONE,
    }).format(savedAt);
    expect(screen.getByRole('status').textContent).toBe(`Saved at ${expectedTime}`);
  });

  it('says it is saving, with a single live region, one answer to the reader', () => {
    renderHeader({ displayState: 'saving' });

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe('Saving…');
  });

  it('always offers a way to change how the page looks', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: 'Appearance' })).toBeDefined();
  });

  it('keeps the page info, favorite star, and recent-visit mark out of a page that was never saved', () => {
    renderHeader({ pageId: null });

    expect(screen.queryByRole('button', { name: 'Info' })).toBeNull();
    expect(screen.queryByRole('button', { name: /favorite/ })).toBeNull();
    expect(screen.queryByTestId(/recent-recorder/)).toBeNull();
  });

  it('offers the page info once the page has an id, counting its own writing', () => {
    renderHeader({
      content: {
        content: [{ content: [{ text: 'Hello there', type: 'text' }], type: 'paragraph' }],
        schemaVersion: 1,
        type: 'doc',
      },
      pageId: 'page-1',
    });

    expect(screen.getByRole('button', { name: 'Info' })).toBeDefined();
  });

  it('offers the version history only for a page that was saved', () => {
    renderHeader({ pageId: 'page-1' });
    expect(screen.getByRole('button', { name: 'Version history' })).toBeDefined();

    cleanup();
    renderHeader({ pageId: null });
    expect(screen.queryByRole('button', { name: 'Version history' })).toBeNull();
  });

  it('mounts the favorite star and the recent-visit mark once it has what they need', () => {
    renderHeader({ isFavorite: true, pageId: 'page-1', spaceName: 'Handbook space' });

    expect(screen.getByRole('button', { name: 'favorite:page-1:true' })).toBeDefined();
    expect(screen.getByTestId('recent-recorder:page-1:Handbook space')).toBeDefined();
  });

  it('keeps the icon control out of a page that was never saved', () => {
    renderHeader({ pageId: null });

    expect(screen.queryByRole('button', { name: 'Add an icon' })).toBeNull();
  });

  it('offers the icon control once the page has an id', () => {
    renderHeader({ pageId: 'page-1' });

    expect(screen.getByRole('button', { name: 'Add an icon' })).toBeDefined();
  });

  it('shows the page icon once one is set', () => {
    renderHeader({ icon: { kind: 'emoji', value: '🚀' }, pageId: 'page-1' });

    expect(screen.getByRole('button', { name: 'Icon for Policies' }).textContent).toContain('🚀');
  });
});
