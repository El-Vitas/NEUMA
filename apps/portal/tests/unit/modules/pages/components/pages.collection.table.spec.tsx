import { describe, expect, it, mock } from 'bun:test';
import { type PageViewWireOperation, readPageViewOperation } from '@neuma/shared';
import { act, cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import {
  EMPTY_PAGE_VIEW_AGGREGATES,
  NO_PAGE_AGGREGATES,
} from '@/modules/pages/collections/constants/pages.aggregates.constants';
import { toCalculationItemId } from '@/modules/pages/collections/lib/pages.query-aggregates.lib';
import type {
  PageRow,
  PageSchema,
  PageSchemaProperty,
  PageViewBand,
  PageViewGroup,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

const written: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];
const saved: { operations: PageViewWireOperation[]; viewId: string }[] = [];
const moves: Record<string, unknown>[] = [];

const readWrittenOperation = () => {
  const [wire] = saved[0]?.operations ?? [];
  return wire === undefined ? null : readPageViewOperation(wire).getValue();
};

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
// The selection bar reaches these; without them the real module pulls in server code.
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageRowPropertiesAction: async (input: {
    pageId: string;
    propertyValues: Record<string, unknown>;
    spaceId: string;
  }) => {
    written.push(input);
    return { data: null };
  },
  updatePageCollectionAction: async () => ({ data: schema }),
  applyPageViewOperationsAction: async (input: { operations: PageViewWireOperation[]; viewId: string }) => {
    saved.push(input);
    return { data: { configuration: {}, id: input.viewId, version: 1 } };
  },
  loadMorePageRowsAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  movePageRowAction: async (input: Record<string, unknown>) => {
    moves.push(input);
    return { data: { configuration: {}, id: 'view-table', version: 1 } };
  },
}));

const { PagesCollectionTable } = await import('@/modules/pages/collections/components/pages.collection.table');

/** The counts arrive after the rows: a `use` that suspended gets a turn to read what has already arrived. */
const renderResolved = async (ui: ReactNode): Promise<void> => {
  await act(async () => {
    renderWithMessages(ui);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const properties: PageSchemaProperty[] = [
  {
    config: defaultConfig,
    key: 'status',
    label: 'Status',
    options: asPropertyOptions('todo', 'done'),
    required: true,
    type: 'SELECT',
  },
];

const rows: PageRow[] = [
  {
    id: 'row-2',
    lifecycle: 'ACTIVE',
    version: 1,
    order: 1,
    parentId: 'collection-1',
    propertyValues: { status: 'done' },
    spaceId: 'space-1',
    title: 'Second task',
  },
  {
    id: 'row-1',
    lifecycle: 'ACTIVE',
    version: 1,
    order: 0,
    parentId: 'collection-1',
    propertyValues: { status: 'todo' },
    spaceId: 'space-1',
    title: 'First task',
  },
];

const view = buildView('Table', 'TABLE', { isDefault: true });

const countStatus = toCalculationItemId('status', 'COUNT_ALL');

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const flatBands = (shownRows: readonly PageRow[]): readonly PageViewBand[] => [
  { color: null, groups: [{ color: null, key: '', label: '', nextCursor: null, rows: shownRows }], key: '', label: '' },
];

const drawTable = (canEdit: boolean, shownRows: readonly PageRow[] = rows) => (
  <PagesCollectionTable
    activeViewName={view.name}
    aggregates={NO_PAGE_AGGREGATES}
    bands={flatBands(shownRows)}
    canEdit={canEdit}
    changesCursor={null}
    properties={properties}
    schema={schema}
    spaceId="space-1"
    view={view}
    viewId={view.id}
  />
);

/** The same rows of the table, read through another stored view of it. */
const drawTableOf = (stored: typeof view) => (
  <PagesCollectionTable
    activeViewName={stored.name}
    aggregates={NO_PAGE_AGGREGATES}
    bands={flatBands(rows)}
    canEdit
    changesCursor={null}
    properties={properties}
    schema={{ ...schema, views: [stored] }}
    spaceId="space-1"
    view={stored}
    viewId={stored.id}
  />
);

describe('PagesCollectionTable', () => {
  it('renders rows in the order provided by the view outcome', async () => {
    renderWithMessages(await drawTable(false));

    const cells = screen.getAllByRole('cell');
    const titleCellTexts = cells.filter(
      (cell) => cell.textContent === 'Second task' || cell.textContent === 'First task',
    );
    expect(titleCellTexts.map((cell) => cell.textContent)).toEqual(['Second task', 'First task']);
    expect(screen.getByRole('link', { name: 'Second task' }).getAttribute('href')).toBe('?panel=row-2');
  });

  it('offers a way to open a row in full page instead of at the side', async () => {
    renderWithMessages(await drawTable(false));

    // Matched by link destination: a server component's words are not translated here.
    const destinations = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/spaces/') === true);

    expect(destinations).toEqual(['/spaces/space-1/pages/row-2', '/spaces/space-1/pages/row-1']);
  });

  it('shows an empty state instead of a table when there are no rows', async () => {
    renderWithMessages(await drawTable(false, []));

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('No rows yet')).toBeDefined();
  });

  it('offers each cell as something to answer, but only to whoever may write', async () => {
    renderWithMessages(await drawTable(true));

    expect(screen.getAllByRole('button', { name: 'Edit Status' })).toHaveLength(rows.length);
  });

  it('says which column a cell answers by its header, instead of repeating the name on every row', async () => {
    renderWithMessages(await drawTable(true));

    expect(screen.getByRole('columnheader', { name: 'Status *' }).id).toBe('collection-column-collection-1-status');
  });

  it('sends only the property that was answered, and leaves the rest of the row alone', async () => {
    written.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Status' })[1]);
    fireEvent.click(screen.getByRole('combobox', { name: 'Status *' }));
    fireEvent.click(await screen.findByRole('option', { name: 'done' }));

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toEqual({ pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' });
  });

  it('offers a foot for each column, and only to whoever may write', async () => {
    renderWithMessages(await drawTable(true));

    expect(screen.getByRole('combobox', { name: 'What to calculate in Status' })).toBeDefined();

    cleanup();
    renderWithMessages(await drawTable(false));

    expect(screen.queryByTestId('collection-table-footer')).toBeNull();
  });

  it('widens a column with the keyboard, and keeps that width in the view', async () => {
    saved.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.keyDown(screen.getByRole('button', { name: 'Width of the Status * column' }), {
      altKey: true,
      key: 'ArrowRight',
    });

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(readWrittenOperation()).toEqual({ command: 'setEntry', key: 'status', map: 'columnWidths', value: 200 });
  });

  it('says how many columns stay put when asked to freeze up to one', async () => {
    saved.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.pointerDown(screen.getAllByTestId('table-column-menu')[1] as HTMLElement, {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Freeze up to here' }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(readWrittenOperation()).toEqual({ command: 'set', key: 'frozenColumns', value: 2 });
  });

  it('wraps the text of one column from its menu, as a change of that one entry of the view', async () => {
    saved.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.pointerDown(screen.getAllByTestId('table-column-menu')[1] as HTMLElement, {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Wrap the text of this column' }));

    await waitFor(() => expect(saved.length).toBeGreaterThan(0));
    const operations = (saved[0]?.operations ?? []).map((wire) => readPageViewOperation(wire).getValue());
    expect(operations).toContainEqual({ command: 'setEntry', key: 'status', map: 'columnWraps', value: true });
  });

  it('wraps a column on its own, without wrapping the others', async () => {
    const wrapping = { ...view, configuration: { columnWraps: { status: true }, rowHeight: 'MEDIUM' } };
    renderWithMessages(await drawTableOf(wrapping));

    const cells = screen.getAllByRole('cell');
    expect(cells[1]?.className).toContain('whitespace-normal');
    expect(cells[0]?.className).toContain('whitespace-nowrap');
  });

  it('puts a grip on each row of a table that follows its own order, only for whoever may edit', async () => {
    renderWithMessages(await drawTable(true));
    expect(screen.getAllByTestId('table-row-handle')).toHaveLength(2);

    cleanup();
    renderWithMessages(await drawTable(false));
    expect(screen.queryByTestId('table-row-handle')).toBeNull();
  });

  it('offers no grip when the view sorts its rows, since their place is then the sort', async () => {
    const sorted = { ...view, configuration: { sorts: [{ direction: 'ASCENDING', propertyKey: 'status' }] } };
    renderWithMessages(await drawTableOf(sorted));

    expect(screen.queryByTestId('table-row-handle')).toBeNull();
  });

  it('puts a row before the one it is dropped on, naming only that neighbour', async () => {
    moves.length = 0;
    renderWithMessages(await drawTable(true));

    const [grip] = screen.getAllByTestId('table-row-handle');
    // The first row is the header, the second is the row being carried, and the third is the one it lands beside.
    const target = screen.getAllByRole('row')[2] as HTMLElement;
    target.getBoundingClientRect = () => ({ height: 40, top: 100 }) as DOMRect;
    fireEvent.dragStart(grip as HTMLElement);
    for (const create of [createEvent.dragOver, createEvent.drop]) {
      // The test environment does not put the pointer height on a drag event.
      const event = create(target);
      Object.defineProperty(event, 'clientY', { value: 105 });
      fireEvent(target, event);
    }

    await waitFor(() => expect(moves).toHaveLength(1));
    expect(moves[0]).toMatchObject({ before: 'row-1', rowId: 'row-2', values: {} });
  });

  it('puts a row one place down with the keyboard', async () => {
    moves.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.keyDown(screen.getAllByTestId('table-row-handle')[0] as HTMLElement, { altKey: true, key: 'ArrowDown' });

    await waitFor(() => expect(moves).toHaveLength(1));
    expect(moves[0]).toMatchObject({ after: 'row-1', rowId: 'row-2' });
  });

  it('does nothing when a row is moved up from the first place', async () => {
    moves.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.keyDown(screen.getAllByTestId('table-row-handle')[0] as HTMLElement, { altKey: true, key: 'ArrowUp' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(moves).toHaveLength(0);
  });

  it('counts the rows the view let through, not the collection', async () => {
    const counting = { ...view, configuration: { calculations: { status: 'COUNT_ALL' } } };
    const counted = Promise.resolve({ ...EMPTY_PAGE_VIEW_AGGREGATES, calculations: { [countStatus]: 1 } });
    await renderResolved(
      <PagesCollectionTable
        activeViewName={counting.name}
        aggregates={counted}
        bands={flatBands([rows[0] as PageRow])}
        canEdit
        changesCursor={null}
        properties={properties}
        schema={{ ...schema, views: [counting] }}
        spaceId="space-1"
        view={counting}
        viewId={counting.id}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'What to calculate in Status' }).textContent).toBe('Rows 1');
  });
});

describe('PagesCollectionTable — agrupada', () => {
  const grouped = { ...view, configuration: { calculations: { status: 'COUNT_ALL' }, groupBy: 'status' } };
  const groupedAggregates = Promise.resolve({
    ...EMPTY_PAGE_VIEW_AGGREGATES,
    groupCalculations: { done: { [countStatus]: 1 }, todo: { [countStatus]: 1 } },
    groupCounts: { done: 1, todo: 1 },
  });

  const drawGrouped = (
    collapsedGroups: readonly string[] = [],
    extra: Readonly<Record<string, unknown>> = {},
    emptyGroups: readonly PageViewGroup[] = [],
  ) => {
    const shown = { ...grouped, configuration: { ...grouped.configuration, collapsedGroups, ...extra } };
    return (
      <PagesCollectionTable
        activeViewName={grouped.name}
        aggregates={groupedAggregates}
        bands={[
          {
            color: null,
            groups: [
              { color: 'GREEN', key: 'done', label: 'done', nextCursor: null, rows: [rows[0] as PageRow] },
              { color: null, key: 'todo', label: 'todo', nextCursor: null, rows: [rows[1] as PageRow] },
              ...emptyGroups,
            ],
            key: '',
            label: '',
          },
        ]}
        canEdit
        changesCursor={null}
        properties={properties}
        schema={{ ...schema, views: [shown] }}
        spaceId="space-1"
        view={shown}
        viewId={grouped.id}
      />
    );
  };

  it('opens each group with a band saying what it is and how many it holds', async () => {
    await renderResolved(await drawGrouped());

    const bands = screen.getAllByTestId('collection-table-group');
    expect(bands).toHaveLength(2);
    expect(bands[0]?.textContent).toContain('done');
    expect(bands[0]?.textContent).toContain('1');
  });

  it('says under each group what its own rows add up to', async () => {
    await renderResolved(await drawGrouped());

    const perGroup = screen.getAllByTestId('collection-table-group-calculations');
    expect(perGroup).toHaveLength(2);
    expect(perGroup[0]?.textContent).toContain('Rows 1');
  });

  it('hides the rows of a group that was folded, and keeps its band', async () => {
    renderWithMessages(await drawGrouped(['done']));

    expect(screen.getAllByTestId('collection-table-group')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Second task' })).toBeNull();
    expect(screen.getByRole('link', { name: 'First task' })).toBeDefined();
  });

  const emptyGroup: PageViewGroup = { color: null, key: 'blocked', label: 'blocked', nextCursor: null, rows: [] };

  it('keeps an empty group in sight while nobody asked to hide it', async () => {
    renderWithMessages(await drawGrouped([], {}, [emptyGroup]));

    expect(screen.getAllByTestId('collection-table-group')).toHaveLength(3);
  });

  it('leaves out the groups with no rows when the view asked for it', async () => {
    renderWithMessages(await drawGrouped([], { hidesEmptyGroups: true }, [emptyGroup]));

    const bands = screen.getAllByTestId('collection-table-group');
    expect(bands).toHaveLength(2);
    expect(bands.map((band) => band.textContent).join(' ')).not.toContain('blocked');
  });

  it('offers to move a group that is a declared value, and not the first one further up', async () => {
    renderWithMessages(await drawGrouped());

    const up = screen.getAllByRole('button', { name: /group up/ });
    expect(up).toHaveLength(2);
    expect((up[0] as HTMLButtonElement).disabled).toBe(true);
    expect((up[1] as HTMLButtonElement).disabled).toBe(false);
  });
});
