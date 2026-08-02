import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/shared/components/ui/stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Pending" value={12} />);
    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('renders a positive delta with a plus sign', () => {
    render(<StatCard delta={{ value: 8, label: 'vs. previous month' }} label="Revenue" value="$1,500" />);
    expect(screen.getByText('+8%')).toBeDefined();
    expect(screen.getByText('vs. previous month')).toBeDefined();
  });

  it('renders a negative delta without a plus sign', () => {
    render(<StatCard delta={{ value: -5 }} label="Revenue" value="$1,500" />);
    expect(screen.getByText('-5%')).toBeDefined();
  });
});
