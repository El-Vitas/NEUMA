import { describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '@/modules/pages/collections/constants/pages.row-context.constants';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';
import { COLLECTION_ACTION_STUBS } from '../stubs/pages.actions.stubs';

const written: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];
const created: { propertyValues: Record<string, unknown>; title: string }[] = [];
const navigated: string[] = [];

mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined, replace: (href: string) => navigated.push(href) }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  ...COLLECTION_ACTION_STUBS,
  applyPageViewOperationsAction: async () => ({ data: { configuration: {}, id: 'view-calendar', version: 1 } }),
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageUndatedCountAction: async () => ({ data: null }),
  updatePageRowPropertiesAction: async (input: {
    pageId: string;
    propertyValues: Record<string, unknown>;
    spaceId: string;
  }) => {
    written.push(input);
    return { data: null };
  },
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async (input: { propertyValues: Record<string, unknown>; title: string }) => {
    created.push(input);
    return { data: { id: 'row-new' } };
  },
}));

const { PagesCollectionCalendar } = await import('@/modules/pages/collections/components/pages.collection.calendar');

const properties: PageSchemaProperty[] = [
  { config: defaultConfig, key: 'dueDate', label: 'Due date', options: null, required: false, type: 'DATE' },
];

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [] };

const rowOn = (id: string, title: string, dueDate: null | string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: dueDate === null ? {} : { dueDate: { start: dueDate } },
  spaceId: 'space-1',
  title,
});

const rows: PageRow[] = [
  rowOn('row-1', 'Escribir el informe', '2026-09-10'),
  rowOn('row-2', 'Revisar el informe', '2026-09-10'),
  rowOn('row-3', 'Sin fecha', null),
];

const drawCalendar = (
  dateProperty: null | string = 'dueDate',
  ui: readonly PageRow[] = rows,
  extra: {
    day?: string;
    isTruncated?: boolean;
    month?: string;
    scale?: 'MONTH' | 'WEEK';
    search?: string;
    undated?: number;
  } = {},
): ReactNode => (
  <NextIntlClientProvider locale="en" messages={en}>
    <PAGE_ROW_QUERY_CONTEXT value={{ quickFilter: null, search: extra.search ?? '' }}>
      <PagesCollectionCalendar
        activeViewName="Calendar"
        canEdit
        dateProperty={dateProperty}
        day={extra.day ?? '2026-09-01'}
        isTruncated={extra.isTruncated ?? false}
        month={extra.month ?? '2026-09'}
        rows={ui}
        scale={extra.scale ?? 'MONTH'}
        schema={schema}
        spaceId="space-1"
        undated={extra.undated ?? 1}
        view={buildView('Calendar', 'CALENDAR')}
      />
    </PAGE_ROW_QUERY_CONTEXT>
  </NextIntlClientProvider>
);

const rangedRows: PageRow[] = [
  {
    ...rowOn('row-range', 'Viaje', null),
    propertyValues: { dueDate: { end: '2026-09-12', start: '2026-09-10' } },
  },
];

describe('PagesCollectionCalendar', () => {
  it('opens on the month the server read, not on the month of today', () => {
    cleanup();
    render(drawCalendar());

    expect(screen.getByRole('heading', { name: /September 2026/i })).toBeDefined();
  });

  it('draws six whole weeks', () => {
    cleanup();
    render(drawCalendar());

    expect(screen.getAllByTestId('calendar-day')).toHaveLength(42);
  });

  it('puts every row on the day it says', () => {
    cleanup();
    render(drawCalendar());

    const day = screen.getByRole('region', { name: 'September 10' });
    expect(day.textContent).toContain('Escribir el informe');
    expect(day.textContent).toContain('Revisar el informe');
  });

  it('says how many rows have no date at all', () => {
    cleanup();
    render(drawCalendar());

    expect(screen.getByText(/1 row with no date/)).toBeDefined();
  });

  it('says how many rows have no date even when none of them is among the rows of the grid', () => {
    cleanup();
    render(drawCalendar('dueDate', rows.slice(0, 2), { undated: 7 }));

    expect(screen.getByText(/7 rows with no date/)).toBeDefined();
  });

  it('asks the server for the month before and for the month after, keeping the words searched', () => {
    cleanup();
    navigated.length = 0;
    render(drawCalendar('dueDate', rows, { search: 'informe' }));

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    expect(navigated).toEqual(['?view=Calendar&q=informe&month=2026-08', '?view=Calendar&q=informe&month=2026-10']);
  });

  it('says when the grid holds more rows than a calendar reads, instead of passing the first ones off as all', () => {
    cleanup();
    render(drawCalendar('dueDate', rows, { isTruncated: true }));

    expect(screen.getByRole('status').textContent).toContain('first 1,000');
  });

  it('says nothing about the limit when every row of the grid is drawn', () => {
    cleanup();
    render(drawCalendar());

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('moves an entry to another day with the keyboard, writing only its date', async () => {
    cleanup();
    written.length = 0;
    render(drawCalendar());

    fireEvent.keyDown(screen.getAllByTestId('calendar-entry')[0] as HTMLElement, { altKey: true, key: 'ArrowRight' });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toEqual({
      pageId: 'row-1',
      propertyValues: { dueDate: { start: '2026-09-11' } },
      spaceId: 'space-1',
    });
  });

  it('shows the entry on its new day before the server answers', () => {
    cleanup();
    render(drawCalendar());

    fireEvent.keyDown(screen.getAllByTestId('calendar-entry')[0] as HTMLElement, { altKey: true, key: 'ArrowRight' });

    expect(screen.getByRole('region', { name: 'September 11' }).textContent).toContain('Escribir el informe');
  });

  it('creates a row already dated on the day it was asked for', async () => {
    cleanup();
    created.length = 0;
    render(drawCalendar());

    fireEvent.click(screen.getByRole('button', { name: 'Add a row on September 15' }));
    const field = screen.getByRole('textbox', { name: 'New row on September 15' });
    fireEvent.change(field, { target: { value: 'Preparar la demo' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]?.propertyValues).toEqual({ dueDate: { start: '2026-09-15' } });
    expect(created[0]?.title).toBe('Preparar la demo');
  });

  it('draws a range on every day it lasts, naming it where it starts', () => {
    cleanup();
    render(drawCalendar('dueDate', rangedRows));

    for (const day of ['September 10', 'September 11', 'September 12']) {
      expect(within(screen.getByRole('region', { name: day })).getAllByTestId('calendar-entry')).toHaveLength(1);
    }
    expect(
      screen.queryByRole('region', { name: 'September 13' })?.querySelector('[data-testid="calendar-entry"]'),
    ).toBeNull();
    expect(screen.getByRole('region', { name: 'September 10' }).textContent).toContain('Viaje');
    expect(screen.getByRole('region', { name: 'September 11' }).textContent).not.toContain('Viaje');
  });

  it('moves the whole range by the day it is grabbed by, writing one date', async () => {
    cleanup();
    written.length = 0;
    render(drawCalendar('dueDate', rangedRows));

    const entries = within(screen.getByRole('region', { name: 'September 11' })).getAllByTestId('calendar-entry');
    fireEvent.dragStart(entries[0] as HTMLElement);
    fireEvent.drop(screen.getByRole('region', { name: 'September 15' }));

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toEqual({
      pageId: 'row-range',
      propertyValues: { dueDate: { end: '2026-09-16', start: '2026-09-14' } },
      spaceId: 'space-1',
    });
  });

  it('draws a week as seven tall days, titled by the days it covers', () => {
    cleanup();
    render(drawCalendar('dueDate', rows, { day: '2026-09-10', scale: 'WEEK' }));

    expect(screen.getAllByTestId('calendar-day')).toHaveLength(7);
    expect(screen.getByRole('heading', { name: 'September 7 – September 13' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'September 10' }).textContent).toContain('Escribir el informe');
  });

  it('asks the server for the week before and the week after, around a day', () => {
    cleanup();
    navigated.length = 0;
    render(drawCalendar('dueDate', rows, { day: '2026-09-10', scale: 'WEEK' }));

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));

    expect(navigated).toEqual(['?view=Calendar&day=2026-09-03', '?view=Calendar&day=2026-09-17']);
  });

  it('offers to look at a week or at a month, and tells which one is on', () => {
    cleanup();
    render(drawCalendar());

    expect(screen.getByTestId('date-scale-month').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('date-scale-week').getAttribute('aria-pressed')).toBe('false');
  });

  it('says the view still does not name a date instead of drawing an empty month', () => {
    cleanup();
    render(drawCalendar(null));

    expect(screen.getByText(/does not say which date yet/)).toBeDefined();
    expect(screen.queryByTestId('calendar-day')).toBeNull();
  });
});
