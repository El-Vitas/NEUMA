import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { TableEmptyAction } from '@/shared/components/data-table/table-empty-action';

const baseProps = {
  clearHref: '/items',
  createHref: '/items/nuevo',
  createLabel: 'Nuevo Item',
};

describe('TableEmptyAction', () => {
  it('renders nothing when the table is not empty', () => {
    const { container } = render(<TableEmptyAction hasActiveFilter={false} isEmpty={false} {...baseProps} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the create action when empty without an active filter', () => {
    render(<TableEmptyAction hasActiveFilter={false} isEmpty {...baseProps} />);
    const link = screen.getByRole('link', { name: 'Nuevo Item' });
    expect(link.getAttribute('href')).toBe('/items/nuevo');
  });

  it('renders the clear-filters action when empty with an active filter', () => {
    render(<TableEmptyAction hasActiveFilter isEmpty {...baseProps} />);
    const link = screen.getByRole('link', { name: 'Limpiar filtros' });
    expect(link.getAttribute('href')).toBe('/items');
  });
});
