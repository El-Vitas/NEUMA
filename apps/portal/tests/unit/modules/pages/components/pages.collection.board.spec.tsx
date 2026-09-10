import { describe, expect, it, mock } from 'bun:test';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import type { PageSchemaProperty, PageViewGroup } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

const moved: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];
const reordered: { beforePageId?: string; pageId: string; spaceId: string }[] = [];
const created: { parentId?: string; propertyValues?: Record<string, unknown>; title?: string }[] = [];

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
/** El tablero se mira porque la dirección lo pide, y lo que apunte cada tarjeta tiene que seguir pidiéndolo. */
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('view=Board') }));
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
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async (input: { parentId?: string; propertyValues?: Record<string, unknown>; title: string }) => {
    created.push(input);
    return { data: { id: 'row-new' } };
  },
  reorderPageAction: async (input: { beforePageId?: string; pageId: string; spaceId: string }) => {
    reordered.push(input);
    return { data: null };
  },
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

/** El entorno de prueba no lleva la altura del puntero en el evento, así que se la ponemos. */
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
        bands={[{ color: null, groups: boardGroups, key: '', label: '' }]}
        canEdit={canEdit}
        collectionPageId="collection-1"
        groupByKey="status"
        properties={properties}
        spaceId="space-1"
        subGroupByKey=""
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
    expect(moved[0]).toEqual({ pageId: 'row-1', propertyValues: { status: 'done' }, spaceId: 'space-1' });
  });

  /** A card dropped where it already was would be a write that changes nothing. */
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

  /** Una fila es sobre todo su nombre: sin él no habría nada que la distinga en la columna. */
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

  /**
   * Moving a card up or down inside its own column says nothing about the value
   * the column stands for, so only the order travels.
   */
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
    /** El entorno de prueba no calcula posiciones, así que la altura de la tarjeta se la damos aquí. */
    giveCardHeight(first as HTMLElement, { height: 100, top: 100 });

    fireEvent.dragStart(second as HTMLElement);
    dragOverAt(first as HTMLElement, 120);

    /** La marca dice dónde va a caer antes de soltar, y es lo que la mano mira. */
    await waitFor(() => {
      expect(screen.getAllByTestId('board-drop-gap')[0]?.getAttribute('data-active')).toBe('true');
    });

    fireEvent.drop(screen.getByRole('region', { name: 'todo' }));

    await waitFor(() => expect(reordered).toHaveLength(1));
    expect(reordered[0]).toEqual({ beforePageId: 'row-1', pageId: 'row-2', spaceId: 'space-1' });
    expect(moved).toHaveLength(0);
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
