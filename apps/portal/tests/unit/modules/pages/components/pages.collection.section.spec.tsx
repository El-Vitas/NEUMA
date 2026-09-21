import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type {
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
  PageViewReading,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
/** The settings button and the board reach server actions, which cannot be loaded in a browser-shaped test. */
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
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));

const { PagesCollectionSection } = await import('@/modules/pages/collections/components/pages.collection.section');

const properties: PageSchemaProperty[] = [
  {
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'in_progress', 'done'),
    required: true,
    type: 'SELECT',
  },
];

const boardView: PageSchemaView = {
  configuration: { groupBy: 'status' },
  isDefault: true,
  name: 'Board',
  type: 'BOARD',
};

const tableView: PageSchemaView = { configuration: {}, isDefault: false, name: 'Table', type: 'TABLE' };

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [boardView, tableView] };

/** The settings button is a client piece, and a client piece needs the words its own way. */
const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const emptyBoard: PageViewOutcome = {
  groups: [
    { color: null, key: 'todo', label: 'todo', rows: [] },
    { color: null, key: 'done', label: 'done', rows: [] },
  ],
  kind: 'GROUPED_ROWS',
};

/** Lo que la colección contesta: las filas repartidas, y de cuántas salieron. */
const asReading = (outcome: PageViewOutcome, rowCount = 0, totalRowCount = 0, hasMore = false): PageViewReading => ({
  hasMore,
  outcome,
  rowCount,
  totalRowCount,
});

describe('PagesCollectionSection', () => {
  it('shows only the view being looked at, not every view at once', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: false,
        schema,
        properties,
        reading: asReading(emptyBoard),
        spaceId: 'space-1',
        views: [boardView, tableView],
      }),
    );

    expect(screen.getByTestId('collection-board')).toBeDefined();
    expect(screen.queryByTestId('collection-table')).toBeNull();
  });

  it('offers every view as a link, marking the one being looked at', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: false,
        schema,
        properties,
        reading: asReading(emptyBoard),
        spaceId: 'space-1',
        views: [boardView, tableView],
      }),
    );

    expect(screen.getByRole('link', { name: 'Table' }).getAttribute('href')).toBe('?view=Table');
    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
  });

  /** Whoever cannot write the page cannot reshape what it keeps, so the way in is not drawn for them. */
  it('offers the way into the settings only to whoever can edit the page', async () => {
    const drawFor = async (canEdit: boolean) =>
      renderWithMessages(
        await PagesCollectionSection({
          activeView: boardView,
          canEdit,
          properties,
          reading: asReading(emptyBoard),
          schema,
          spaceId: 'space-1',
          views: [boardView],
        }),
      );

    const forReader = await drawFor(false);
    expect(forReader.queryByTestId('collection-settings')).toBeNull();
    forReader.unmount();

    const forWriter = await drawFor(true);
    expect(forWriter.getByTestId('collection-settings')).toBeDefined();
  });

  it('shows the missing-grouping-property state instead of an empty board when the outcome says so', async () => {
    const outcome: PageViewOutcome = { kind: 'MISSING_GROUPING_PROPERTY' };
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: false,
        schema,
        properties,
        reading: asReading(outcome),
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
    expect(screen.queryByTestId('collection-board')).toBeNull();
  });

  it('shows a load error when the view outcome could not be fetched', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: false,
        schema,
        properties,
        reading: null,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByRole('alert')).toBeDefined();
  });

  /**
   * Un filtro que no deja pasar nada no es una colección vacía: decir «aún no
   * hay filas» manda a agregar una que ya está ahí, escondida.
   */
  it('explains that the filter is hiding everything instead of saying the collection is empty', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard, 0, 13),
        schema,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByText('collection.everythingFiltered')).toBeDefined();
    expect(screen.queryByTestId('collection-board')).toBeNull();
  });

  it('says how many rows are being looked at, of how many there are', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard, 4, 13),
        schema,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByText('collection.rowCount')).toBeDefined();
  });

  /** Ver quinientas de mil sin que nadie lo diga se lee como ver la colección entera. */
  it('says so when the collection held more rows than were brought', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard, 500, 500, true),
        schema,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByTestId('collection-partial')).toBeDefined();
  });

  it('says nothing about a cut when the whole collection fits', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard, 4, 13),
        schema,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.queryByTestId('collection-partial')).toBeNull();
  });
});
