import { describe, expect, it, mock } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import {
  EMPTY_PAGE_VIEW_AGGREGATES,
  NO_PAGE_AGGREGATES,
} from '@/modules/pages/collections/constants/pages.aggregates.constants';
import type {
  PageSchema,
  PageSchemaProperty,
  PageViewOutcome,
  PageViewReading,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';
import { COLLECTION_ACTION_STUBS } from '../stubs/pages.actions.stubs';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/shared/server/lib/time-zone.server', () => ({ readRequestTimeZone: async () => null }));
mock.module('@/shared/server/actions/time-zone.actions', () => ({ rememberTimeZoneAction: async () => undefined }));
mock.module('@/modules/pages/templates/server/queries/pages.templates.queries', () => ({
  getPageTemplates: async () => ({ isFail: () => true }),
}));
mock.module('@/modules/pages/templates/server/actions/pages.templates.actions', () => ({
  createPageTemplateAction: async () => undefined,
  deletePageTemplateAction: async () => undefined,
  listPageTemplatesAction: async () => undefined,
  setDefaultPageTemplateAction: async () => undefined,
  updatePageTemplateAction: async () => undefined,
}));
// Server actions cannot be loaded in a browser-shaped test.
mock.module('@/modules/pages/collections/server/queries/pages.schema.queries', () => ({
  getSpaceCollections: async () => ({ getValue: () => [{ id: 'collection-2', title: 'Projects' }], isOk: () => true }),
}));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  ...COLLECTION_ACTION_STUBS,
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  rewritePageCollectionOptionAction: async () => ({ data: null }),
  updatePageCollectionAction: async () => ({ data: null }),
  applyPageViewOperationsAction: async () => ({ data: null }),
  loadMorePageRowsAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageCollectionAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  movePageRowAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
// The live follower opens a socket and loads server actions, which a test of the section does not need.
mock.module('@/modules/pages/collections/components/pages.collection.live-follower', () => ({
  PagesCollectionLiveFollower: () => null,
}));
mock.module('@/modules/pages/collections/components/pages.collection.computed-sources-follower', () => ({
  PagesCollectionComputedSourcesFollower: () => null,
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
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'in_progress', 'done'),
    required: true,
    type: 'SELECT',
  },
];

const boardView = buildView('Board', 'BOARD', { configuration: { groupBy: 'status' }, isDefault: true });

const tableView = buildView('Table', 'TABLE');

const filteredBoardView = buildView('Board', 'BOARD', {
  configuration: {
    filter: {
      conditions: [{ kind: 'CONDITION', operator: 'IS', propertyKey: 'status', value: 'todo' }],
      kind: 'GROUP',
      operator: 'AND',
    },
    groupBy: 'status',
  },
  isDefault: true,
});

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [boardView, tableView] };

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

const asReading = (outcome: PageViewOutcome): PageViewReading => ({
  aggregates: NO_PAGE_AGGREGATES,
  attachedFiles: [],
  changesCursor: null,
  outcome,
  relatedRows: [],
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

  it('explains that the filter is hiding everything instead of saying the collection is empty', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: filteredBoardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard),
        schema: { ...schema, views: [filteredBoardView] },
        spaceId: 'space-1',
        views: [filteredBoardView],
      }),
    );

    expect(screen.getByText('collection.everythingFiltered')).toBeDefined();
    expect(screen.queryByTestId('collection-board')).toBeNull();
  });

  it('does not say the filter hides everything when the view has no filter', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: true,
        properties,
        reading: asReading(emptyBoard),
        schema,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.queryByText('collection.everythingFiltered')).toBeNull();
  });

  it('says how many rows the view holds in all once the database has counted them', async () => {
    const counted = Promise.resolve({ ...EMPTY_PAGE_VIEW_AGGREGATES, distinctRowCount: 13 });
    const section = await PagesCollectionSection({
      activeView: boardView,
      canEdit: true,
      properties,
      reading: { ...asReading(emptyBoard), aggregates: counted },
      schema,
      spaceId: 'space-1',
      views: [boardView],
    });

    await act(async () => {
      renderWithMessages(section);
    });

    expect(screen.getByText('13 rows')).toBeDefined();
  });
});
