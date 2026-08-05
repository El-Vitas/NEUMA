import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Table, TableBody } from '@/shared/components/ui/table';
import { TableEmptyState } from '@/shared/components/ui/table-empty-state';

describe('TableEmptyState', () => {
  it('renders a table row with a spanning cell and its message and action', () => {
    render(
      <Table>
        <TableBody>
          <TableEmptyState
            action={<button type="button">Create record</button>}
            className="custom-class"
            colSpan={3}
            message="No records"
          />
        </TableBody>
      </Table>,
    );

    const row = screen.getByRole('row');
    const cell = screen.getByRole('cell');

    expect(row.parentElement?.tagName).toBe('TBODY');
    expect(cell.parentElement).toBe(row);
    expect(cell.getAttribute('colspan')).toBe('3');
    expect(cell.classList.contains('custom-class')).toBe(true);
    expect(screen.getByText('No records').textContent).toBe('No records');
    expect(screen.getByRole('button', { name: 'Create record' }).textContent).toBe('Create record');
  });
});
