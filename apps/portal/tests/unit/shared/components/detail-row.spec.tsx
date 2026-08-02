import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { DetailRow } from '@/shared/components/ui/detail-row';

describe('DetailRow', () => {
  it('renders label and value', () => {
    render(<DetailRow label="Correo" value="user@example.com" />);
    expect(screen.getByText('Correo')).toBeDefined();
    expect(screen.getByText('user@example.com')).toBeDefined();
  });

  it('renders a node value', () => {
    render(<DetailRow label="Estado" value={<span>Activo</span>} />);
    expect(screen.getByText('Activo')).toBeDefined();
  });
});
