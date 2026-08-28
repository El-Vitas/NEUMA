import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type {
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewOutcome,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
/** The settings button and the board reach server actions, which cannot be loaded in a browser-shaped test. */
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
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

describe('PagesCollectionSection', () => {
  it('shows only the view being looked at, not every view at once', async () => {
    renderWithMessages(
      await PagesCollectionSection({
        activeView: boardView,
        canEdit: false,
        schema,
        outcome: emptyBoard,
        properties,
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
        outcome: emptyBoard,
        properties,
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
          outcome: emptyBoard,
          properties,
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
        outcome,
        properties,
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
        outcome: null,
        properties,
        spaceId: 'space-1',
        views: [boardView],
      }),
    );

    expect(screen.getByRole('alert')).toBeDefined();
  });
});
