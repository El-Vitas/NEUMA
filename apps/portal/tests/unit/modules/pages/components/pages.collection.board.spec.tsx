import { describe, expect, it, mock } from 'bun:test';
import { UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { NO_PAGE_AGGREGATES } from '@/modules/pages/collections/constants/pages.aggregates.constants';
import type {
  PageSchema,
  PageSchemaProperty,
  PageViewGroup,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

interface MovedRow {
  after?: string;
  before?: string;
  listChanges?: Record<string, { add: string[]; remove: string[] }>;
  pageId: string;
  rowId: string;
  spaceId: string;
  values: Record<string, unknown>;
  viewId: string;
}

const moved: MovedRow[] = [];
const reordered: { beforePageId?: string; pageId: string; spaceId: string }[] = [];
const created: { parentId?: string; propertyValues?: Record<string, unknown>; title?: string }[] = [];
const rewritten: { optionId: string; to: null | string }[] = [];
const reshaped: { properties: unknown }[] = [];
const viewOperations: { operations: { args: unknown; command: string; path: string[] }[] }[] = [];

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
// The address selects the board view.
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('view=Board') }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  rewritePageCollectionOptionAction: async (input: { optionId: string; to: null | string }) => {
    rewritten.push(input);
    return { data: null };
  },
  updatePageCollectionAction: async (input: { properties: unknown }) => {
    reshaped.push(input);
    return { data: { pageId: 'collection-1', properties: input.properties, spaceId: 'space-1', views: [] } };
  },
  applyPageViewOperationsAction: async (input: {
    operations: { args: unknown; command: string; path: string[] }[];
  }) => {
    viewOperations.push(input);
    return { data: { configuration: {}, id: view.id, version: 1 } };
  },
  loadMorePageRowsAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async () => ({ data: null }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  refreshPageCollectionAction: async () => ({ data: null }),
  refreshPageRowsAction: async () => ({ data: null }),
  movePageRowAction: async (input: MovedRow) => {
    moved.push(input);
    return { data: { configuration: {}, id: input.viewId, version: 1 } };
  },
  updatePageRowPropertiesAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async (input: { parentId?: string; propertyValues?: Record<string, unknown>; title: string }) => {
    created.push(input);
    return { data: { id: 'row-new' } };
  },
  reorderPageAction: async (input: { beforePageId?: string; pageId: string; spaceId: string }) => {
    reordered.push(input);
    return { data: null };
  },
  // The selection bar reaches these three; without them the real module pulls in server code.
  duplicatePageAction: async () => ({ data: { id: 'row-copy' } }),
  restorePageAction: async () => ({ data: null }),
  trashPageAction: async () => ({ data: null }),
}));

const { PagesCollectionBoard } = await import('@/modules/pages/collections/components/pages.collection.board');
const { PagesCollectionBoardMissingGrouping } = await import(
  '@/modules/pages/collections/components/pages.collection.board.missing-grouping'
);

const firstRow = {
  id: 'row-1',
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: {},
  spaceId: 'space-1',
  title: 'First task',
} as const;

const secondRow = { ...firstRow, id: 'row-2', order: 1, title: 'Second task' } as const;

const groups: PageViewGroup[] = [
  { color: 'GREEN', key: 'todo', label: 'todo', rows: [firstRow] },
  { color: null, key: 'done', label: 'done', rows: [] },
];

// The test environment does not put the pointer height on the event.
const dragOverAt = (card: HTMLElement, pointerY: number): void => {
  const event = createEvent.dragOver(card);
  Object.defineProperty(event, 'clientY', { value: pointerY });
  fireEvent(card, event);
};

const giveCardHeight = (card: HTMLElement, box: { height: number; top: number }): void => {
  card.getBoundingClientRect = () =>
    ({
      bottom: box.top + box.height,
      height: box.height,
      left: 0,
      right: 0,
      top: box.top,
      width: 0,
      x: 0,
      y: box.top,
    }) as DOMRect;
};

const shownProperties: PageSchemaProperty[] = [
  {
    config: defaultConfig,
    key: 'priority',
    label: 'Priority',
    options: asPropertyOptions('low', 'high'),
    required: false,
    type: 'SELECT',
  },
];

const statusProperty: PageSchemaProperty = {
  config: defaultConfig,
  key: 'status',
  label: 'Status',
  options: asPropertyOptions('todo', 'done'),
  required: false,
  type: 'SELECT',
};

const view = buildView('Board', 'BOARD', { configuration: { groupBy: 'status' }, isDefault: true });

const schema: PageSchema = {
  pageId: 'collection-1',
  properties: [statusProperty],
  spaceId: 'space-1',
  views: [view],
};

const drawBoard = (
  canEdit: boolean,
  boardGroups: readonly PageViewGroup[] = groups,
  properties: readonly PageSchemaProperty[] = [],
) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesCollectionBoard
        activeViewName="Board"
        aggregates={NO_PAGE_AGGREGATES}
        bands={[{ color: null, groups: boardGroups, key: '', label: '' }]}
        canEdit={canEdit}
        changesCursor={null}
        groupByKey="status"
        isManualOrder
        properties={properties}
        schema={schema}
        spaceId="space-1"
        subGroupByKey=""
        view={view}
        viewId={view.id}
      />
    </NextIntlClientProvider>,
  );

describe('PagesCollectionBoard', () => {
  it('groups rows under their column and shows an empty message for a column without rows', () => {
    drawBoard(false);

    expect(screen.getByRole('link', { name: 'First task' }).getAttribute('href')).toBe('?view=Board&panel=row-1');
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
    reordered.length = 0;
    drawBoard(true);
    const card = screen.getByTestId('collection-board-card');
    const done = screen.getByRole('region', { name: 'done' });

    fireEvent.dragStart(card);
    fireEvent.dragOver(done);
    fireEvent.drop(done);

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]).toEqual({
      listChanges: {},
      pageId: 'collection-1',
      rowId: 'row-1',
      spaceId: 'space-1',
      values: { status: 'done' },
      viewId: view.id,
    });
  });

  it('does not write anything when a card is dropped on its own column', async () => {
    moved.length = 0;
    reordered.length = 0;
    drawBoard(true);
    const card = screen.getByTestId('collection-board-card');
    const todo = screen.getByRole('region', { name: 'todo' });

    fireEvent.dragStart(card);
    fireEvent.dragOver(todo);
    fireEvent.drop(todo);

    await waitFor(() => expect(moved).toHaveLength(0));
    expect(reordered).toHaveLength(0);
  });

  it('creates a row with the name it was given, already answering the column it was created in', async () => {
    created.length = 0;
    drawBoard(true);

    fireEvent.click(screen.getByRole('button', { name: 'New row in «done»' }));
    const field = await screen.findByRole('textbox', { name: 'New row in «done»' });
    fireEvent.change(field, { target: { value: 'Revisar el contrato' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({
      parentId: 'collection-1',
      propertyValues: { status: 'done' },
      title: 'Revisar el contrato',
    });
  });

  it('creates nothing when the name was left blank', async () => {
    created.length = 0;
    drawBoard(true);

    fireEvent.click(screen.getByRole('button', { name: 'New row in «done»' }));
    const field = await screen.findByRole('textbox', { name: 'New row in «done»' });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'New row in «done»' })).toBeNull();
    });
    expect(created).toHaveLength(0);
  });

  it('writes only the order when a card is dropped above another in its own column', async () => {
    moved.length = 0;
    reordered.length = 0;
    drawBoard(true, [
      {
        color: null,
        key: 'todo',
        label: 'todo',
        rows: [firstRow, secondRow],
      },
      { color: null, key: 'done', label: 'done', rows: [] },
    ]);
    const [first, second] = screen.getAllByTestId('collection-board-card');
    // The test environment computes no layout, so the card height is given here.
    giveCardHeight(first as HTMLElement, { height: 100, top: 100 });

    fireEvent.dragStart(second as HTMLElement);
    dragOverAt(first as HTMLElement, 120);

    await waitFor(() => {
      expect(screen.getAllByTestId('board-drop-gap')[0]?.getAttribute('data-active')).toBe('true');
    });

    fireEvent.drop(screen.getByRole('region', { name: 'todo' }));

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]).toEqual({
      before: 'row-1',
      listChanges: {},
      pageId: 'collection-1',
      rowId: 'row-2',
      spaceId: 'space-1',
      values: {},
      viewId: view.id,
    });
    expect(reordered).toHaveLength(0);
  });

  it('moves a card with the keyboard, for whoever cannot drag', async () => {
    moved.length = 0;
    drawBoard(true);

    fireEvent.keyDown(screen.getByTestId('collection-board-card'), { altKey: true, key: 'ArrowRight' });

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]?.values).toEqual({ status: 'done' });
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

    expect(screen.getByText('high')).toBeDefined();
  });

  it('leaves out of the card a property the row did not answer', () => {
    drawBoard(false, groups, shownProperties);

    expect(screen.queryByText('Priority')).toBeNull();
  });
});

const optionsWritten = (): readonly string[] => {
  const properties = reshaped[0]?.properties;
  if (!Array.isArray(properties)) return [];
  const [first] = properties as PageSchemaProperty[];
  return (first?.options ?? []).map((option) => option.value);
};

// The menu opens only on a real mouse press; a synthetic click does not.
const openColumnMenu = (): void => {
  const trigger = screen.getAllByTestId('board-column-menu')[0];
  if (trigger === undefined) throw new Error('No column menu to open');
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
};

describe('PagesCollectionBoard — mandando sobre las columnas', () => {
  it('offers the column its own actions only to whoever may write', () => {
    drawBoard(true);
    expect(screen.getAllByTestId('board-column-menu').length).toBeGreaterThan(0);

    cleanup();
    drawBoard(false);
    expect(screen.queryByTestId('board-column-menu')).toBeNull();
    expect(screen.queryByTestId('board-new-column')).toBeNull();
  });

  it('offers no actions on the column of rows without a value', () => {
    drawBoard(true, [{ color: null, key: UNASSIGNED_GROUP_KEY, label: 'Unassigned', rows: [] }]);

    expect(screen.queryByTestId('board-column-menu')).toBeNull();
  });

  it('renames the column saying where the name comes from, so the rows can follow', async () => {
    rewritten.length = 0;
    drawBoard(true);

    openColumnMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename the column' }));
    const field = screen.getByRole('textbox', { name: 'New name for todo' });
    fireEvent.change(field, { target: { value: 'pendiente' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(rewritten).toHaveLength(1));
    expect(rewritten[0]).toMatchObject({ optionId: 'todo', propertyKey: 'status', to: 'pendiente' });
  });

  it('asks before removing a column, saying how many rows are left without a value', async () => {
    rewritten.length = 0;
    drawBoard(true);

    openColumnMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Remove the column' }));

    expect(screen.getByText('One row is left without a value, but none is deleted.')).toBeDefined();
    expect(rewritten).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Remove the column' }));
    await waitFor(() => expect(rewritten).toHaveLength(1));
    expect(rewritten[0]).toMatchObject({ optionId: 'todo', propertyKey: 'status', to: null });
  });

  it('refuses a name another column already answers to, without asking the server', async () => {
    rewritten.length = 0;
    drawBoard(true);

    openColumnMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename the column' }));
    const field = screen.getByRole('textbox', { name: 'New name for todo' });
    fireEvent.change(field, { target: { value: 'done' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    // The warning is drawn by the toaster, which is not mounted here.
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'New name for todo' })).toBeNull());
    expect(rewritten).toHaveLength(0);
  });

  it('folds a column into a strip that still says its name and how many it holds', async () => {
    const collapsed = { ...view, configuration: { ...view.configuration, collapsedGroups: ['todo'] } };
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesCollectionBoard
          activeViewName={collapsed.name}
          aggregates={NO_PAGE_AGGREGATES}
          bands={[{ color: null, groups, key: '', label: '' }]}
          canEdit
          changesCursor={null}
          groupByKey="status"
          isManualOrder
          properties={[]}
          schema={{ ...schema, views: [collapsed] }}
          spaceId="space-1"
          subGroupByKey=""
          view={collapsed}
          viewId={collapsed.id}
        />
      </NextIntlClientProvider>,
    );

    const strip = screen.getByTestId('board-column-collapsed');
    expect(strip.textContent).toContain('todo');
    expect(strip.textContent).toContain('1');
    expect(screen.queryByRole('link', { name: 'First task' })).toBeNull();
  });

  it('says a column is over its limit without keeping anyone from dropping there', () => {
    const limited = { ...view, configuration: { ...view.configuration, columnLimits: { todo: 1 } } };
    const crowded = [{ ...groups[0], rows: [...(groups[0]?.rows ?? []), { ...groups[0]?.rows[0], id: 'row-3' }] }];
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesCollectionBoard
          activeViewName={limited.name}
          aggregates={NO_PAGE_AGGREGATES}
          bands={[{ color: null, groups: crowded as PageViewGroup[], key: '', label: '' }]}
          canEdit
          changesCursor={null}
          groupByKey="status"
          isManualOrder
          properties={[]}
          schema={{ ...schema, views: [limited] }}
          spaceId="space-1"
          subGroupByKey=""
          view={limited}
          viewId={limited.id}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId('board-column-over-limit').textContent).toBe('Over the limit of 1.');
    expect(screen.getAllByTestId('collection-board-card')).toHaveLength(2);
  });

  it('moves a column before the one it was dropped on, and that order is of the property', async () => {
    reshaped.length = 0;
    drawBoard(true);

    const handles = screen.getAllByTestId('board-column-handle');
    fireEvent.dragStart(handles[1] as HTMLElement);
    fireEvent.dragOver(screen.getAllByTestId('board-column')[0] as HTMLElement);
    fireEvent.drop(screen.getAllByTestId('board-column')[0] as HTMLElement);

    await waitFor(() => expect(reshaped).toHaveLength(1));
    expect(optionsWritten()).toEqual(['done', 'todo']);
  });

  it('does not offer a gap between cards while what is being carried is a column', () => {
    drawBoard(true);

    fireEvent.dragStart(screen.getAllByTestId('board-column-handle')[1] as HTMLElement);
    dragOverAt(screen.getAllByTestId('collection-board-card')[0] as HTMLElement, 120);

    expect(
      screen.getAllByTestId('board-drop-gap').filter((gap) => gap.getAttribute('data-active') === 'true'),
    ).toHaveLength(0);
  });

  it('marks the column under the card as where the carried column would land', () => {
    drawBoard(true);

    fireEvent.dragStart(screen.getAllByTestId('board-column-handle')[1] as HTMLElement);
    dragOverAt(screen.getAllByTestId('collection-board-card')[0] as HTMLElement, 120);

    expect(screen.getAllByTestId('board-column')[0]?.className).toContain('ring-primary');
  });

  it('moves a column sideways with the keyboard', async () => {
    reshaped.length = 0;
    drawBoard(true);

    fireEvent.keyDown(screen.getAllByTestId('board-column-handle')[0] as HTMLElement, {
      altKey: true,
      key: 'ArrowRight',
    });

    await waitFor(() => expect(reshaped).toHaveLength(1));
    expect(optionsWritten()).toEqual(['done', 'todo']);
  });

  it('adds a column as a new value of the property the board groups by', async () => {
    reshaped.length = 0;
    drawBoard(true);

    fireEvent.click(screen.getByTestId('board-new-column'));
    const field = screen.getByRole('textbox', { name: 'Column name' });
    fireEvent.change(field, { target: { value: 'blocked' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(reshaped).toHaveLength(1));
    const savedProperties = (reshaped[0]?.properties ?? []) as PageSchemaProperty[];
    const saved = savedProperties.at(0);
    expect(saved?.options?.slice(0, 2)).toEqual([...asPropertyOptions('todo', 'done')]);
    expect(saved?.options?.[2]).toMatchObject({ color: 'ORANGE', group: null, value: 'blocked' });
    expect(saved?.options?.[2]?.id).toStartWith('draft-');
  });
});

describe('PagesCollectionBoard — grupos ocultos, bandas y portadas', () => {
  it('hides a group from its menu, as a change of that one list of the view', async () => {
    viewOperations.length = 0;
    drawBoard(true);

    openColumnMenu();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Hide the group' }));

    await waitFor(() => expect(viewOperations).toHaveLength(1));
    expect(viewOperations[0]?.operations).toHaveLength(1);
    expect(viewOperations[0]?.operations[0]).toMatchObject({
      args: { id: 'todo' },
      path: ['configuration', 'hiddenGroups'],
    });
  });

  it('lists the hidden groups apart, with a way to show each again', async () => {
    const hidden = { ...view, configuration: { ...view.configuration, hiddenGroups: ['done'] } };
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesCollectionBoard
          activeViewName={hidden.name}
          aggregates={NO_PAGE_AGGREGATES}
          bands={[{ color: null, groups: [groups[0] as PageViewGroup], key: '', label: '' }]}
          canEdit
          changesCursor={null}
          groupByKey="status"
          isManualOrder
          properties={[]}
          schema={{ ...schema, views: [hidden] }}
          spaceId="space-1"
          subGroupByKey=""
          view={hidden}
          viewId={hidden.id}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.pointerDown(screen.getByRole('button', { name: '1 hidden group' }), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });

    expect(await screen.findByRole('menuitem', { name: /Show “done”/ })).toBeDefined();
  });

  it('offers no way to hide groups to whoever cannot edit', () => {
    cleanup();
    drawBoard(false);

    expect(screen.queryByRole('button', { name: 'How the cards look' })).toBeNull();
  });

  it('offers the size and the cover of the cards to whoever may edit', () => {
    cleanup();
    drawBoard(true);

    expect(screen.getByRole('button', { name: 'How the cards look' })).toBeDefined();
  });
});

describe('PagesCollectionBoardMissingGrouping', () => {
  it('renders a distinct state instead of pretending the board is empty', async () => {
    render(await PagesCollectionBoardMissingGrouping());

    expect(screen.getByTestId('collection-board-missing-grouping-property')).toBeDefined();
    expect(screen.getByText('collection.missingGroupingProperty')).toBeDefined();
  });
});
