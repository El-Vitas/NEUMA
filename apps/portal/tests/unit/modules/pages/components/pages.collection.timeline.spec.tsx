import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import { PAGE_ROW_QUERY_CONTEXT } from '@/modules/pages/collections/constants/pages.row-context.constants';
import type {
  PageRow,
  PageSchema,
  PageSchemaProperty,
  PageTimelineReading,
} from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { defaultConfig } from '../lib/pages.options.fixture';
import { COLLECTION_ACTION_STUBS } from '../stubs/pages.actions.stubs';

const written: { pageId: string; propertyValues: Record<string, unknown>; spaceId: string }[] = [];
const operations: unknown[] = [];
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
  applyPageViewOperationsAction: async (input: unknown) => {
    operations.push(input);
    return { data: { configuration: {}, id: 'view-plan', version: 1 } };
  },
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
  createPageAction: async () => ({ data: { id: 'row-new' } }),
}));

const { PagesCollectionTimeline } = await import('@/modules/pages/collections/components/pages.collection.timeline');

const properties: PageSchemaProperty[] = [
  { config: defaultConfig, key: 'when', label: 'When', options: null, required: false, type: 'DATE' },
  { config: defaultConfig, key: 'due', label: 'Due', options: null, required: false, type: 'DATE' },
];

const planView = {
  configuration: {},
  id: 'view-plan',
  isDefault: true,
  name: 'Plan',
  type: 'TIMELINE',
  version: 0,
} as const;

const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [planView] };

const rowOf = (id: string, title: string, when: null | { end?: string; start: string }): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: when === null ? {} : { when },
  spaceId: 'space-1',
  title,
});

const reading = (overrides: Partial<PageTimelineReading> = {}): PageTimelineReading => ({
  anchor: '2026-09-16',
  isTruncated: false,
  scale: 'DAY',
  today: '2026-09-16',
  undated: 0,
  undatedRows: [],
  window: { end: '2026-10-18', start: '2026-09-07' },
  ...overrides,
});

const rows = [
  rowOf('row-1', 'Escribir el informe', { end: '2026-09-18', start: '2026-09-14' }),
  rowOf('row-2', 'Revisar', { start: '2026-09-21' }),
];

const drawTimeline = (
  extra: {
    canEdit?: boolean;
    dateProperty?: null | string;
    list?: readonly PageRow[];
    reading?: PageTimelineReading;
    search?: string;
  } = {},
): ReactNode => (
  <NextIntlClientProvider locale="en" messages={en}>
    <PAGE_ROW_QUERY_CONTEXT value={{ quickFilter: null, search: extra.search ?? '' }}>
      <PagesCollectionTimeline
        activeViewName="Plan"
        canEdit={extra.canEdit ?? true}
        dateProperty={extra.dateProperty === undefined ? 'when' : extra.dateProperty}
        endDateProperty={null}
        rows={extra.list ?? rows}
        schema={schema}
        spaceId="space-1"
        timeline={extra.reading ?? reading()}
        view={planView}
      />
    </PAGE_ROW_QUERY_CONTEXT>
  </NextIntlClientProvider>
);

const press = (element: HTMLElement, x: number): void => {
  fireEvent.pointerDown(element, { button: 0, clientX: x, pointerId: 1 });
};

describe('PagesCollectionTimeline', () => {
  beforeEach(() => {
    written.length = 0;
    operations.length = 0;
    navigated.length = 0;
    HTMLElement.prototype.setPointerCapture = () => undefined;
    HTMLElement.prototype.releasePointerCapture = () => undefined;
    HTMLElement.prototype.hasPointerCapture = () => true;
  });

  it('draws a bar for each row, as wide as the days it lasts and starting on the day it starts', () => {
    cleanup();
    render(drawTimeline());

    const bars = screen.getAllByTestId('timeline-bar');
    // Window opens on 2026-09-07 and a day is 40 pixels wide.
    expect(bars).toHaveLength(2);
    expect(bars[0]?.style.left).toBe(`${7 * 40}px`);
    expect(bars[0]?.style.width).toBe(`${5 * 40}px`);
    expect(bars[1]?.style.width).toBe(`${40}px`);
  });

  it('marks today with a line', () => {
    cleanup();
    render(drawTimeline());

    expect(screen.getByTestId('timeline-today')).toBeDefined();
  });

  it('draws no line for today when the window does not hold it', () => {
    cleanup();
    render(drawTimeline({ reading: reading({ today: '2027-01-01' }) }));

    expect(screen.queryByTestId('timeline-today')).toBeNull();
  });

  it('says so instead of drawing an empty chart when no row lasts into the window', () => {
    cleanup();
    render(drawTimeline({ list: [] }));

    expect(screen.getByText(/No row lasts into these days/)).toBeDefined();
  });

  it('lists the rows with no start apart, saying how many there are in all', () => {
    cleanup();
    render(drawTimeline({ reading: reading({ undated: 5, undatedRows: [rowOf('row-9', 'Sin inicio', null)] }) }));

    const apart = screen.getByTestId('timeline-undated');
    expect(apart.textContent).toContain('5 rows with no start');
    expect(apart.textContent).toContain('Sin inicio');
    expect(apart.textContent).toContain('and 4 more');
  });

  it('says the window holds more rows than it draws instead of passing the first ones off as all', () => {
    cleanup();
    render(drawTimeline({ reading: reading({ isTruncated: true }) }));

    expect(screen.getByRole('status').textContent).toContain('first 2');
  });

  it('moves a bar by the days the pointer went, writing the dates of that row in one write', async () => {
    cleanup();
    render(drawTimeline());

    const bar = screen.getAllByTestId('timeline-bar')[0] as HTMLElement;
    press(bar, 100);
    fireEvent.pointerMove(bar, { clientX: 180, pointerId: 1 });
    fireEvent.pointerUp(bar, { clientX: 180, pointerId: 1 });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toEqual({
      pageId: 'row-1',
      propertyValues: { when: { end: '2026-09-20', start: '2026-09-16' } },
      spaceId: 'space-1',
    });
  });

  it('stretches the end of a bar from its handle, and only the end', async () => {
    cleanup();
    render(drawTimeline());

    const handle = within(screen.getAllByTestId('timeline-bar')[0] as HTMLElement).getByTestId('timeline-handle-end');
    press(handle, 300);
    fireEvent.pointerMove(handle, { clientX: 380, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 380, pointerId: 1 });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ when: { end: '2026-09-20', start: '2026-09-14' } });
  });

  it('stretches the start of a bar from its handle', async () => {
    cleanup();
    render(drawTimeline());

    const handle = within(screen.getAllByTestId('timeline-bar')[0] as HTMLElement).getByTestId('timeline-handle-start');
    press(handle, 300);
    fireEvent.pointerMove(handle, { clientX: 220, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 220, pointerId: 1 });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ when: { end: '2026-09-18', start: '2026-09-12' } });
  });

  it('writes nothing when the pointer comes back to the day it left from', () => {
    cleanup();
    render(drawTimeline());

    const bar = screen.getAllByTestId('timeline-bar')[0] as HTMLElement;
    press(bar, 100);
    fireEvent.pointerMove(bar, { clientX: 180, pointerId: 1 });
    fireEvent.pointerUp(bar, { clientX: 105, pointerId: 1 });

    expect(written).toHaveLength(0);
  });

  it('shows the bar on its new days before the server answers', async () => {
    cleanup();
    render(drawTimeline());

    const bar = screen.getAllByTestId('timeline-bar')[0] as HTMLElement;
    press(bar, 100);
    fireEvent.pointerUp(bar, { clientX: 180, pointerId: 1 });

    await waitFor(() =>
      expect((screen.getAllByTestId('timeline-bar')[0] as HTMLElement).style.left).toBe(`${9 * 40}px`),
    );
  });

  it('moves a bar with the keyboard, a day at a time', async () => {
    cleanup();
    render(drawTimeline());

    fireEvent.keyDown(screen.getAllByTestId('timeline-bar')[0] as HTMLElement, { altKey: true, key: 'ArrowRight' });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ when: { end: '2026-09-19', start: '2026-09-15' } });
  });

  it('stretches the end of a bar with the keyboard when Shift is held', async () => {
    cleanup();
    render(drawTimeline());

    fireEvent.keyDown(screen.getAllByTestId('timeline-bar')[0] as HTMLElement, {
      altKey: true,
      key: 'ArrowRight',
      shiftKey: true,
    });

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]?.propertyValues).toEqual({ when: { end: '2026-09-19', start: '2026-09-14' } });
  });

  it('lets whoever cannot edit look but not drag', () => {
    cleanup();
    render(drawTimeline({ canEdit: false }));

    const bar = screen.getAllByTestId('timeline-bar')[0] as HTMLElement;
    press(bar, 100);
    fireEvent.pointerUp(bar, { clientX: 180, pointerId: 1 });

    expect(written).toHaveLength(0);
    expect(within(bar).queryByTestId('timeline-handle-end')).toBeNull();
    expect(screen.queryByTestId('date-scale-day')).toBeNull();
  });

  it('asks the server for the days before and after, keeping the words searched', () => {
    cleanup();
    render(drawTimeline({ search: 'informe' }));

    fireEvent.click(screen.getByRole('button', { name: 'Earlier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));

    expect(navigated).toEqual(['?view=Plan&q=informe&day=2026-08-19', '?view=Plan&q=informe&day=2026-10-14']);
  });

  it('goes back to today from anywhere', () => {
    cleanup();
    render(drawTimeline({ reading: reading({ anchor: '2027-01-10' }) }));

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(navigated).toEqual(['?view=Plan&day=2026-09-16']);
  });

  it('saves the scale as a change of that one key of the view', async () => {
    cleanup();
    render(drawTimeline());

    fireEvent.click(screen.getByTestId('date-scale-week'));

    await waitFor(() => expect(operations).toHaveLength(1));
    expect(operations[0]).toMatchObject({
      operations: [{ args: 'WEEK', command: 'set', path: ['configuration', 'dateScale'] }],
      viewId: 'view-plan',
    });
  });

  it('asks which date holds the start when the view does not say, instead of drawing nothing', () => {
    cleanup();
    render(drawTimeline({ dateProperty: null }));

    expect(screen.getByText(/does not say which date holds the start/)).toBeDefined();
    expect(screen.queryByTestId('timeline-bar')).toBeNull();
    expect(screen.getByRole('combobox', { name: /starts its rows on/ })).toBeDefined();
  });

  it('draws only the rows in view when there are thousands of them', () => {
    cleanup();
    const many = Array.from({ length: 2000 }, (_unused, position) =>
      rowOf(`row-${String(position)}`, `Fila ${String(position)}`, {
        start: `2026-09-${String((position % 20) + 8).padStart(2, '0')}`,
      }),
    );
    const started = performance.now();

    render(<div data-scroll-container="">{drawTimeline({ list: many })}</div>);

    expect(screen.getAllByTestId('timeline-row').length).toBeLessThan(60);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
