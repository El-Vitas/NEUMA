import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';
import type { PageRow, PageSchemaProperty } from '@/modules/pages/collections/types/pages.schema.types';
import en from '../../../../../messages/en.json';
import { asPropertyOptions } from '../lib/pages.options.fixture';

mock.module('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, ...rest }: ComponentProps<'a'>) => <a {...rest}>{children}</a>,
}));

const { PagesCollectionTable } = await import('@/modules/pages/collections/components/pages.collection.table');

/** A cell draws a client piece, and a client piece needs the words its own way. */
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

describe('PagesCollectionTable', () => {
  it('renders rows in the order provided by the view outcome', async () => {
    renderWithMessages(await PagesCollectionTable({ properties, rows, spaceId: 'space-1' }));

    const cells = screen.getAllByRole('cell');
    const titleCellTexts = cells.filter(
      (cell) => cell.textContent === 'Second task' || cell.textContent === 'First task',
    );
    expect(titleCellTexts.map((cell) => cell.textContent)).toEqual(['Second task', 'First task']);
    expect(screen.getByRole('link', { name: 'Second task' }).getAttribute('href')).toBe('?panel=row-2');
  });

  it('offers a way to open a row in full page instead of at the side', async () => {
    renderWithMessages(await PagesCollectionTable({ properties, rows, spaceId: 'space-1' }));

    /**
     * Asked for by where each link leads rather than by what it is called: a
     * server component's words are not translated here, and what this test is
     * about is that the full page is reachable at all.
     */
    const destinations = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/spaces/') === true);

    expect(destinations).toEqual(['/spaces/space-1/pages/row-2', '/spaces/space-1/pages/row-1']);
  });

  it('shows an empty state instead of a table when there are no rows', async () => {
    renderWithMessages(await PagesCollectionTable({ properties, rows: [], spaceId: 'space-1' }));

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('collection.emptyTable')).toBeDefined();
  });
});
