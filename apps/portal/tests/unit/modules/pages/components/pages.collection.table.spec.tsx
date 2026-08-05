import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/types/pages.schema.types';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) => <a href={href}>{children}</a>,
}));

const { PagesCollectionTable } = await import('@/modules/pages/components/pages.collection.table');

const properties: PageSchemaProperty[] = [
  { key: 'status', label: 'Status', options: ['todo', 'done'], required: true, type: 'SELECT' },
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

describe('PagesCollectionTable', () => {
  it('renders rows in the order provided by the view outcome', async () => {
    render(await PagesCollectionTable({ properties, rows, spaceId: 'space-1' }));

    const cells = screen.getAllByRole('cell');
    const titleCellTexts = cells.filter(
      (cell) => cell.textContent === 'Second task' || cell.textContent === 'First task',
    );
    expect(titleCellTexts.map((cell) => cell.textContent)).toEqual(['Second task', 'First task']);
    expect(screen.getByRole('link', { name: 'Second task' }).getAttribute('href')).toBe('/spaces/space-1/pages/row-2');
  });

  it('shows an empty state instead of a table when there are no rows', async () => {
    render(await PagesCollectionTable({ properties, rows: [], spaceId: 'space-1' }));

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('collection.emptyTable')).toBeDefined();
  });
});
