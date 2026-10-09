import { describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type { PageRow, PageSchema, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

const written: { pageId: string; propertyValues: Record<string, unknown> }[] = [];
const trashed: string[] = [];
const restored: string[] = [];
const duplicated: string[] = [];

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, scroll: _scroll, ...rest }: ComponentProps<'a'> & { scroll?: boolean }) => (
    <a {...rest}>{children}</a>
  ),
  useRouter: () => ({ refresh: () => undefined }),
}));
mock.module('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
mock.module('@/modules/pages/collections/server/actions/pages.collections.actions', () => ({
  updatePageRowPropertiesAction: async (input: { pageId: string; propertyValues: Record<string, unknown> }) => {
    written.push(input);
    return { data: null };
  },
  updatePageCollectionAction: async () => ({ data: null }),
  updatePageViewConfigurationAction: async () => ({ data: null }),
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
  { key: 'status', label: 'Status', options: asPropertyOptions('todo', 'done'), required: true, type: 'SELECT' },
];

const rowOf = (id: string, title: string, status: string): PageRow => ({
  id,
  lifecycle: 'ACTIVE',
  order: 0,
  parentId: 'collection-1',
  propertyValues: { status },
  spaceId: 'space-1',
  title,
});

const rows = [rowOf('row-1', 'Primera', 'todo'), rowOf('row-2', 'Segunda', 'done')];
const view = { configuration: {}, isDefault: true, name: 'Table', type: 'TABLE' as const };
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
    await PagesCollectionTable({
      activeViewName: 'Table',
      canEdit,
      groups: [{ color: null, key: '', label: '', rows }],
      isGrouped: false,
      properties,
      schema,
      spaceId: 'space-1',
    }),
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
