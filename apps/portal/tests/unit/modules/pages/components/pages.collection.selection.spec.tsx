import { describe, expect, it, mock } from 'bun:test';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import {
  EMPTY_PAGE_VIEW_AGGREGATES,
  NO_PAGE_AGGREGATES,
} from '@/modules/pages/collections/constants/pages.aggregates.constants';
import { PAGE_ROW_QUERY_CONTEXT } from '@/modules/pages/collections/constants/pages.row-context.constants';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions, defaultConfig } from '../lib/pages.options.fixture';
import { buildView } from '../lib/pages.views.fixture';

const written: { pageId: string; propertyValues: Record<string, unknown> }[] = [];
const trashed: string[] = [];
const restored: string[] = [];
const duplicated: string[] = [];
const matchingAsked: Record<string, unknown>[] = [];

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  changePageRowRelationAction: async () => ({ data: 'CHANGED' }),
  listPageRelationCandidatesAction: async () => ({ data: [] }),
  updatePageRowPropertiesAction: async (input: { pageId: string; propertyValues: Record<string, unknown> }) => {
    written.push(input);
    return { data: null };
  },
  updatePageCollectionAction: async () => ({ data: null }),
  applyPageViewOperationsAction: async () => ({ data: null }),
  loadMorePageRowsAction: async () => ({ data: null }),
  movePageRowAction: async () => ({ data: null }),
  readEveryPageRowAction: async () => ({ data: null }),
  readPageCollectionAction: async () => ({ data: null }),
  readPageCollectionChangesAction: async () => ({ data: null }),
  readPageViewAggregatesAction: async () => ({ data: null }),
  readPageMatchingRowsAction: async (input: Record<string, unknown>) => {
    matchingAsked.push(input);
    const rowIds = ['row-1', 'row-2', 'far-3', 'far-4', 'far-5'];
    return {
      data: {
        isTooMany: false,
        rowIds,
        valuesByRow: Object.fromEntries(rowIds.map((id) => [id, { status: 'todo' }])),
      },
    };
  },
  refreshPageRowsAction: async () => ({ data: null }),
}));
mock.module('@/modules/pages/server/actions/pages.actions', () => ({
  createPageAction: async () => ({ data: { id: 'row-new' } }),
  duplicatePageAction: async (input: { pageId: string }) => {
    duplicated.push(input.pageId);
    return { data: { id: `${input.pageId}-copy` } };
  },
  reorderPageAction: async () => ({ data: null }),
  restorePageAction: async (input: { pageId: string }) => {
    restored.push(input.pageId);
    return { data: null };
  },
  trashPageAction: async (input: { pageId: string }) => {
    trashed.push(input.pageId);
    return { data: null };
  },
}));

const { PagesCollectionTable } = await import('@/modules/pages/collections/components/pages.collection.table');

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

const rowOf = (id: string, title: string, status: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  version: 1,
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status },
  spaceId: 'space-1',
  title,
});

const rows = [rowOf('row-1', 'Primera', 'todo'), rowOf('row-2', 'Segunda', 'done')];
const view = buildView('Table', 'TABLE', { isDefault: true });
const schema: PageSchema = { pageId: 'collection-1', properties, spaceId: 'space-1', views: [view] };

const renderWithMessages = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );

const drawTable = async (canEdit = true) => {
  cleanup();
  return renderWithMessages(
    <PagesCollectionTable
      activeViewName="Table"
      aggregates={NO_PAGE_AGGREGATES}
      bands={[
        { color: null, groups: [{ color: null, key: '', label: '', nextCursor: null, rows }], key: '', label: '' },
      ]}
      canEdit={canEdit}
      changesCursor={null}
      properties={properties}
      schema={schema}
      spaceId="space-1"
      view={view}
      viewId={view.id}
    />,
  );
};

describe('marcar filas', () => {
  it('no dice nada mientras no hay ninguna marcada', async () => {
    await drawTable();

    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  it('dice cuántas hay marcadas en cuanto se marca una', async () => {
    await drawTable();

    fireEvent.click(screen.getAllByTestId('row-checkbox')[0] as HTMLElement);

    expect(screen.getByTestId('selection-bar').textContent).toContain('1 row selected');
  });

  it('marca de una vez todas las filas que se ven', async () => {
    await drawTable();

    fireEvent.click(screen.getByTestId('select-all-rows'));

    expect(screen.getByTestId('selection-bar').textContent).toContain('2 rows selected');
  });

  it('las desmarca todas cuando ya lo estaban', async () => {
    await drawTable();

    fireEvent.click(screen.getByTestId('select-all-rows'));
    fireEvent.click(screen.getByTestId('select-all-rows'));

    expect(screen.queryByTestId('selection-bar')).toBeNull();
  });

  it('no ofrece casillas a quien no puede escribir', async () => {
    await drawTable(false);

    expect(screen.queryAllByTestId('row-checkbox')).toHaveLength(0);
  });
});

describe('marcar todas las filas que coinciden, no solo las cargadas', () => {
  const countedAs = (distinctRowCount: number) => Promise.resolve({ ...EMPTY_PAGE_VIEW_AGGREGATES, distinctRowCount });

  const drawLongTable = async (distinctRowCount: number, search = '') => {
    cleanup();
    return renderWithMessages(
      <PAGE_ROW_QUERY_CONTEXT value={{ quickFilter: null, search }}>
        <PagesCollectionTable
          activeViewName="Table"
          aggregates={countedAs(distinctRowCount)}
          bands={[
            {
              color: null,
              groups: [{ color: null, key: '', label: '', nextCursor: 'after-2', rows }],
              key: '',
              label: '',
            },
          ]}
          canEdit
          changesCursor={null}
          properties={properties}
          schema={schema}
          spaceId="space-1"
          view={view}
          viewId={view.id}
        />
      </PAGE_ROW_QUERY_CONTEXT>,
    );
  };

  const markLoadedRows = async (): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-all-rows'));
    });
  };

  it('offers every matching row once the loaded ones are marked and there are more', async () => {
    await drawLongTable(5);

    await markLoadedRows();

    expect(await screen.findByRole('button', { name: 'Select all 5 matching rows' })).toBeDefined();
  });

  it('marks all of them, the ones never loaded included, asking with the words searched', async () => {
    matchingAsked.length = 0;
    await drawLongTable(5, 'informe');

    await markLoadedRows();
    fireEvent.click(await screen.findByRole('button', { name: 'Select all 5 matching rows' }));

    await waitFor(() => expect(screen.getByTestId('selection-bar').textContent).toContain('5 rows selected'));
    expect(matchingAsked).toEqual([
      { pageId: 'collection-1', quickFilter: null, search: 'informe', spaceId: 'space-1', viewId: view.id },
    ]);
  });

  it('acts on the rows it marked without loading them: the previous values travel for the undo', async () => {
    trashed.length = 0;
    await drawLongTable(5);

    await markLoadedRows();
    fireEvent.click(await screen.findByRole('button', { name: 'Select all 5 matching rows' }));
    await waitFor(() => expect(screen.getByTestId('selection-bar').textContent).toContain('5 rows selected'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(trashed).toContain('far-5'));
  });

  it('says that too many match instead of marking part of them', async () => {
    await drawLongTable(1500);

    await markLoadedRows();

    expect(await screen.findByText(/1,500 rows match/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Select all 1,500/ })).toBeNull();
  });

  it('offers nothing when the loaded rows are all there is', async () => {
    await drawLongTable(2);

    await markLoadedRows();
    await screen.findByTestId('selection-bar');

    expect(screen.queryByRole('button', { name: /matching rows/ })).toBeNull();
  });
});

describe('lo que se hace con lo marcado', () => {
  it('manda a la papelera todas las marcadas', async () => {
    trashed.length = 0;
    await drawTable();

    fireEvent.click(screen.getByTestId('select-all-rows'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(trashed).toHaveLength(2));
    expect(trashed).toEqual(['row-1', 'row-2']);
  });

  it('duplica todas las marcadas', async () => {
    duplicated.length = 0;
    await drawTable();

    fireEvent.click(screen.getAllByTestId('row-checkbox')[1] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() => expect(duplicated).toEqual(['row-2']));
  });

  it('deja de marcar cuando la operación terminó', async () => {
    trashed.length = 0;
    await drawTable();

    fireEvent.click(screen.getByTestId('select-all-rows'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(trashed).toHaveLength(2));
    await waitFor(() => expect(screen.queryByTestId('selection-bar')).toBeNull(), { timeout: 3000 });
  });
});
