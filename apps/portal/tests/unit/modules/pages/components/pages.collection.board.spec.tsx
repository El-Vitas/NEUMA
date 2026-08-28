import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import type { PageSchemaProperty, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

const moved: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction: async (input: {
    pageId: string;
    propertyValues: Record<string, unknown>;
    spaceId: string;
  }) => {
    moved.push(input);
    return { data: null };
  },
}));

const { PagesCollectionBoard } = await import('@/modules/pages/collections/components/pages.collection.board');
const { PagesCollectionBoardMissingGrouping } = await import(
  '@/modules/pages/collections/components/pages.collection.board.missing-grouping'
);

const groups: PageViewGroup[] = [
  {
    color: 'GREEN',
    key: 'todo',
    label: 'todo',
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
  },
  { color: null, key: 'done', label: 'done', rows: [] },
];

const shownProperties: PageSchemaProperty[] = [
  { key: 'priority', label: 'Priority', options: asPropertyOptions('low', 'high'), required: false, type: 'SELECT' },
];

const drawBoard = (
  canEdit: boolean,
  boardGroups: readonly PageViewGroup[] = groups,
  properties: readonly PageSchemaProperty[] = [],
) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesCollectionBoard
        canEdit={canEdit}
        groupByKey="status"
        groups={boardGroups}
        properties={properties}
        spaceId="space-1"
      />
    </NextIntlClientProvider>,
  );

describe('PagesCollectionBoard', () => {
  it('groups rows under their column and shows an empty message for a column without rows', () => {
    drawBoard(false);

    expect(screen.getByRole('link', { name: 'First task' }).getAttribute('href')).toBe('?panel=row-1');
    const fullPage = screen.getAllByRole('link').find((link) => link.getAttribute('href')?.startsWith('/spaces/'));

    expect(fullPage?.getAttribute('href')).toBe('/spaces/space-1/pages/row-1');
    expect(screen.getByText('No rows')).toBeDefined();
  });

  it('names the group of rows without a value in the reader own language', () => {
    drawBoard(false, [{ color: null, key: 'unassigned', label: 'Unassigned', rows: [] }]);

    expect(screen.getByText('Unassigned')).toBeDefined();
  });

  it('writes the column a card was dropped on into the property the board groups by', async () => {
    moved.length = 0;
    drawBoard(true);
    const card = screen.getByTestId('collection-board-card');

    fireEvent.dragStart(card);
    fireEvent.drop(screen.getByRole('region', { name: 'done' }));

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]).toEqual({ pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' });
  });

  /** A card dropped where it already was would be a write that changes nothing. */
  it('does not write anything when a card is dropped on its own column', async () => {
    moved.length = 0;
    drawBoard(true);
    const card = screen.getByTestId('collection-board-card');

    fireEvent.dragStart(card);
    fireEvent.drop(screen.getByRole('region', { name: 'todo' }));

    await waitFor(() => expect(moved).toHaveLength(0));
  });

  it('moves a card with the keyboard, for whoever cannot drag', async () => {
    moved.length = 0;
    drawBoard(true);

    fireEvent.keyDown(screen.getByTestId('collection-board-card'), { altKey: true, key: 'ArrowRight' });

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]?.propertyValues).toEqual({ status: 'done' });
  });

  it('leaves the cards alone for whoever cannot edit the page', () => {
    drawBoard(false);

    expect(screen.getByTestId('collection-board-card').getAttribute('draggable')).toBe('false');
  });

  it('shows on the card the properties the view chose', () => {
    const withPriority = [
      { ...groups[0], rows: [{ ...groups[0]?.rows[0], propertyValues: { priority: 'high' } }] },
    ] as PageViewGroup[];
    drawBoard(false, withPriority, shownProperties);

    /** Shown the way a person reads it, not the way it is stored. */
    expect(screen.getByText('High')).toBeDefined();
  });

  /** A card is small: a row of empty labels costs the space the answered ones need. */
  it('leaves out of the card a property the row did not answer', () => {
    drawBoard(false, groups, shownProperties);

    expect(screen.queryByText('Priority')).toBeNull();
  });
});

describe('PagesCollectionBoardMissingGrouping', () => {
  it('renders a distinct state instead of pretending the board is empty', async () => {
    render(await PagesCollectionBoardMissingGrouping());

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
    expect(screen.getByText('collection.missingGroupingProperty')).toBeDefined();
  });
});
