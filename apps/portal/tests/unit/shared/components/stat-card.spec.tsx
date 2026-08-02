import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/shared/components/ui/stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Pendientes" value={12} />);
    expect(screen.getByText('Pendientes')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('renders a positive delta with a plus sign', () => {
    render(<StatCard delta={{ value: 8, label: 'vs mes anterior' }} label="Ingresos" value="$1.500" />);
    expect(screen.getByText('+8%')).toBeDefined();
    expect(screen.getByText('vs mes anterior')).toBeDefined();
  });

  it('renders a negative delta without a plus sign', () => {
    render(<StatCard delta={{ value: -5 }} label="Ingresos" value="$1.500" />);
    expect(screen.getByText('-5%')).toBeDefined();
  });
});
