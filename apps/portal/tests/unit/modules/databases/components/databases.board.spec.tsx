import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { DatabasesBoard } from '@/modules/databases/components/databases.board';
import type { DatabaseProperty, DatabaseRecord } from '@/modules/databases/types/databases.types';
import en from '../../../../../messages/en.json';

const property: DatabaseProperty = {
  key: 'status',
  label: 'Status',
  options: ['Todo', 'Done'],
  required: false,
  type: 'SELECT',
};

const records: readonly DatabaseRecord[] = [
  {
    databaseId: 'database-1',
    id: 'record-1',
    lifecycle: 'ACTIVE',
    order: 0,
    propertyValues: { status: 'Todo' },
    title: 'Review mobile board',
  },
];

describe('DatabasesBoard', () => {
  it('stacks board columns on narrow screens instead of requiring horizontal scrolling', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <DatabasesBoard property={property} records={records} />
      </NextIntlClientProvider>,
    );

    const boardColumns = screen.getByTestId('database-board-columns').className;
    expect(boardColumns).toContain('grid-cols-1');
    expect(boardColumns).toContain('md:grid-cols-3');
    expect(boardColumns).not.toContain('grid-flow-col');
    expect(screen.getByText('Review mobile board')).not.toBeNull();
  });
});
