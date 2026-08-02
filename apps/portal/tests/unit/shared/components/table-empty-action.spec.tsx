import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { TableEmptyAction } from '@/shared/components/data-table/table-empty-action';
import en from '../../../../messages/en.json';

const baseProps = {
  clearHref: '/items',
  createHref: '/items/nuevo',
  createLabel: 'Nuevo Item',
};

const renderWithMessages = (component: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {component}
    </NextIntlClientProvider>,
  );

describe('TableEmptyAction', () => {
  it('renders nothing when the table is not empty', () => {
    const { container } = renderWithMessages(
      <TableEmptyAction hasActiveFilter={false} isEmpty={false} {...baseProps} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the create action when empty without an active filter', () => {
    renderWithMessages(<TableEmptyAction hasActiveFilter={false} isEmpty {...baseProps} />);
    const link = screen.getByRole('link', { name: 'Nuevo Item' });
    expect(link.getAttribute('href')).toBe('/items/nuevo');
  });

  it('renders the clear-filters action when empty with an active filter', () => {
    renderWithMessages(<TableEmptyAction hasActiveFilter isEmpty {...baseProps} />);
    const link = screen.getByRole('link', { name: 'Reset filters' });
    expect(link.getAttribute('href')).toBe('/items');
  });
});
