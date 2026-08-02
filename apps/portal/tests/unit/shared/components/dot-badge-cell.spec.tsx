import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { DotBadgeCell } from '@/shared/components/data-table/dot-badge-cell';

describe('DotBadgeCell', () => {
  it('renders the label', () => {
    render(<DotBadgeCell dotColor="bg-success" label="Paid" />);
    expect(screen.getByText('Paid')).toBeDefined();
  });
});
