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
/** The board reaches a server action, which cannot be loaded in a browser-shaped test. */
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  reorderPageAction: async () => ({ data: null }),
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

const groupedOutcome: PageViewOutcome = {
  groups: [
    { color: null, key: 'todo', label: 'todo', rows: [] },
    { color: null, key: 'done', label: 'done', rows: [] },
  ],
  kind: 'GROUPED_ROWS',
};

const flatOutcome: PageViewOutcome = {
  kind: 'FLAT_ROWS',
  rows: [
    {
      id: 'row-1',
      lifecycle: 'ACTIVE',
      order: 0,
      parentId: 'collection-1',
      propertyValues: {},
      spaceId: 'space-1',
      title: 'First task',
    },
  ],
};

/** A view may draw a client piece, and a client piece needs the words its own way. */
const drawView = async (outcome: PageViewOutcome | null, view: PageSchemaView) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {
        await PagesCollectionView({
          canEdit: false,
          collectionPageId: 'collection-1',
          outcome,
          properties,
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
