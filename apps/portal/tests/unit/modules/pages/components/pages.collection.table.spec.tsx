import { describe, expect, it, mock } from 'bun:test';
import { readPageViewConfiguration } from '@company-brain/shared';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type {
  PageRow,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewGroup,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

const written: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];
const saved: { configuration: Record<string, unknown>; viewName: string }[] = [];

const readWrittenConfiguration = () => readPageViewConfiguration(saved[0]?.configuration ?? {});

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
  updatePageRowPropertiesAction: async (input: {
    pageId: string;
    propertyValues: Record<string, unknown>;
    spaceId: string;
  }) => {
    written.push(input);
    return { data: null };
  },
  updatePageCollectionAction: async () => ({ data: schema }),
  updatePageViewConfigurationAction: async (input: { configuration: Record<string, unknown>; viewName: string }) => {
    saved.push(input);
    return { data: { ...schema, views: [{ ...view, configuration: input.configuration }] } };
  },
}));

const { PagesCollectionTable } = await import('@/modules/pages/collections/components/pages.collection.table');

const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const properties: PageSchemaProperty[] = [
  { key: 'status', label: 'Status', options: asPropertyOptions('todo', 'done'), required: true, type: 'SELECT' },
];

const rows: PageRow[] = [
  {
    id: 'row-2',
    lifecycle: 'ACTIVE',
    order: 1,
    parentId: 'collection-1',
    propertyValues: { status: 'done' },
    spaceId: 'space-1',
    title: 'Second task',
  },
  {
    id: 'row-1',
    lifecycle: 'ACTIVE',
    order: 0,
    parentId: 'collection-1',
    propertyValues: { status: 'todo' },
    spaceId: 'space-1',
    title: 'First task',
  },
];

const view: PageSchemaView = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' };

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const drawTable = (canEdit: boolean, shownRows: readonly PageRow[] = rows) =>
  PagesCollectionTable({
    activeViewName: view.name,
    canEdit,
    groups: [{ color: null, key: '', label: '', rows: shownRows }],
    isGrouped: false,
    properties,
    schema,
    spaceId: 'space-1',
  });

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
    expect(screen.getByText('collection.emptyTable')).toBeDefined();
  });

  it('offers each cell as something to answer, but only to whoever may write', async () => {
    renderWithMessages(await drawTable(true));

    expect(screen.getAllByRole('button', { name: 'Edit Status' })).toHaveLength(rows.length);
  });

  it('says which column a cell answers by its header, instead of repeating the name on every row', async () => {
    renderWithMessages(await drawTable(true));

    expect(screen.getByRole('columnheader', { name: 'Status' }).id).toBe('collection-column-collection-1-status');
  });

  it('sends only the property that was answered, and leaves the rest of the row alone', async () => {
    written.length = 0;
    renderWithMessages(await drawTable(true));

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit Status' })[1]);
    fireEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Done' }));

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

    fireEvent.keyDown(screen.getByRole('button', { name: 'Width of the Status column' }), {
      altKey: true,
      key: 'ArrowRight',
    });

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(readWrittenConfiguration()?.columnWidths).toEqual({ status: 200 });
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
    expect(readWrittenConfiguration()?.frozenColumns).toBe(2);
  });

  it('counts the rows the view let through, not the collection', async () => {
    const counting: PageSchemaView = { ...view, configuration: { calculations: { status: 'COUNT_ALL' } } };
    renderWithMessages(
      await PagesCollectionTable({
        activeViewName: counting.name,
        canEdit: true,
        groups: [{ color: null, key: '', label: '', rows: [rows[0] as PageRow] }],
        isGrouped: false,
        properties,
        schema: { ...schema, views: [counting] },
        spaceId: 'space-1',
      }),
    );

    expect(screen.getByRole('combobox', { name: 'What to calculate in Status' }).textContent).toBe('Rows 1');
  });
});

describe('PagesCollectionTable — agrupada', () => {
  const grouped: PageSchemaView = {
    ...view,
    configuration: { calculations: { status: 'COUNT_ALL' }, groupBy: 'status' },
  };

  const drawGrouped = (
    collapsedGroups: readonly string[] = [],
    extra: Readonly<Record<string, unknown>> = {},
    emptyGroups: readonly PageViewGroup[] = [],
  ) =>
    PagesCollectionTable({
      activeViewName: grouped.name,
      canEdit: true,
      groups: [
        { color: 'GREEN', key: 'done', label: 'done', rows: [rows[0] as PageRow] },
        { color: null, key: 'todo', label: 'todo', rows: [rows[1] as PageRow] },
        ...emptyGroups,
      ],
      isGrouped: true,
      properties,
      schema: {
        ...schema,
        views: [{ ...grouped, configuration: { ...grouped.configuration, collapsedGroups, ...extra } }],
      },
      spaceId: 'space-1',
    });

  it('opens each group with a band saying what it is and how many it holds', async () => {
    renderWithMessages(await drawGrouped());

    const bands = screen.getAllByTestId('collection-table-group');
    expect(bands).toHaveLength(2);
    expect(bands[0]?.textContent).toContain('done');
    expect(bands[0]?.textContent).toContain('1');
  });

  it('says under each group what its own rows add up to', async () => {
    renderWithMessages(await drawGrouped());

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

  const emptyGroup: PageViewGroup = { color: null, key: 'blocked', label: 'blocked', rows: [] };

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
