import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { DatabasesTable } from '@/modules/databases/components/databases.table';
import type { DatabaseProperty, DatabaseRecord } from '@/modules/databases/types/databases.types';
import en from '../../../../../messages/en.json';

const properties: readonly DatabaseProperty[] = [
  { key: 'title', label: 'Title', options: null, required: true, type: 'TITLE' },
  { key: 'status', label: 'Status', options: ['Todo', 'Done'], required: false, type: 'SELECT' },
  { key: 'priority', label: 'Priority', options: null, required: false, type: 'NUMBER' },
];

const records: readonly DatabaseRecord[] = [
  {
    databaseId: 'database-1',
    id: 'record-1',
    lifecycle: 'ACTIVE',
    order: 0,
    propertyValues: { priority: 1, status: 'Todo' },
    title: 'Ship responsive database view',
  },
];

const renderTable = (tableRecords: readonly DatabaseRecord[] = records) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DatabasesTable properties={properties} records={tableRecords} />
    </NextIntlClientProvider>,
  );

describe('DatabasesTable', () => {
  it('provides a mobile record representation without relying on the desktop table', () => {
    renderTable();

    expect(screen.getByTestId('database-records-mobile').className).toContain('md:hidden');
    expect(screen.getByTestId('database-records-desktop').className).toContain('hidden');
    expect(screen.getByTestId('database-records-desktop').className).toContain('md:block');
    expect(screen.getByRole('heading', { name: 'Ship responsive database view' })).not.toBeNull();
    expect(screen.getAllByText('Status')).toHaveLength(2);
    expect(screen.getAllByText('Todo')).toHaveLength(2);
  });

  it('keeps the no-records explanation available on mobile', () => {
    renderTable([]);

    expect(screen.getByTestId('database-records-mobile').textContent).toContain('No records are available.');
    expect(screen.getByTestId('database-records-desktop').querySelector('td')?.getAttribute('colspan')).toBe('3');
  });
});
