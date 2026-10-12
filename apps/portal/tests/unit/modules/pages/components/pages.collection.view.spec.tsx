import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import type {
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
// Server actions cannot be loaded in a browser-shaped test.
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageViewConfigurationAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));

const { PagesCollectionView } = await import('@/modules/pages/collections/components/pages.collection.view');

const properties: PageSchemaProperty[] = [
  { key: 'status', label: 'Status', options: asPropertyOptions('todo', 'done'), required: true, type: 'SELECT' },
];

const boardView: PageSchemaView = {
  configuration: { groupBy: 'status' },
  isDefault: false,
  name: 'Board',
  type: 'BOARD',
};

const tableView: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };

const listView: PageSchemaView = { configuration: {}, isDefault: false, name: 'List', type: 'LIST' };

const galleryView: PageSchemaView = { configuration: {}, isDefault: false, name: 'Gallery', type: 'GALLERY' };

const groupedOutcome: PageViewOutcome = {
  groups: [
    { color: null, key: 'todo', label: 'todo', rows: [] },
    { color: null, key: 'done', label: 'done', rows: [] },
  ],
  kind: 'GROUPED_ROWS',
};

const rows = [
  {
    id: 'row-1',
    lifecycle: 'ACTIVE' as const,
    order: 0,
    parentId: 'collection-1',
    propertyValues: {},
    spaceId: 'space-1',
    title: 'First task',
  },
];

const flatOutcome: PageViewOutcome = { kind: 'FLAT_ROWS', rows };

const drawView = async (outcome: PageViewOutcome | null, view: PageSchemaView) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {
        await PagesCollectionView({
          canEdit: false,
          outcome,
          properties,
          schema: { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] },
          spaceId: 'space-1',
          view,
        })
      }
    </NextIntlClientProvider>,
  );

describe('PagesCollectionView', () => {
  it('draws each kind of view with the piece registered for it', async () => {
    await drawView(groupedOutcome, boardView);

    expect(screen.getByTestId('collection-board')).toBeDefined();
  });

  it('draws a table when the view is a table', async () => {
    await drawView(flatOutcome, tableView);

    expect(screen.getByTestId('collection-table')).toBeDefined();
  });

  it('draws a list when the view is a list', async () => {
    await drawView(flatOutcome, listView);

    expect(screen.getByTestId('collection-list')).toBeDefined();
  });

  it('draws a gallery when the view is a gallery', async () => {
    await drawView(flatOutcome, galleryView);

    expect(screen.getByTestId('collection-gallery')).toBeDefined();
  });

  it('draws a list from rows that arrived already gathered in groups', async () => {
    await drawView({ groups: [{ color: null, key: 'todo', label: 'todo', rows }], kind: 'GROUPED_ROWS' }, listView);

    expect(screen.getByTestId('collection-list')).toBeDefined();
  });

  it('says a grouping property is missing instead of drawing an empty board', async () => {
    await drawView({ kind: 'MISSING_GROUPING_PROPERTY' }, boardView);

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
  });

  it('warns instead of crashing when the rows arrive in a shape the view cannot read', async () => {
    await drawView(flatOutcome, boardView);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.queryByTestId('collection-board')).toBeNull();
  });

  it('shows a load error when the view could not be fetched', async () => {
    await drawView(null, tableView);

    expect(screen.getByRole('alert')).toBeDefined();
  });
});
