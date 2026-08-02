import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { DetailRow } from '@/shared/components/ui/detail-row';

describe('DetailRow', () => {
  it('renders label and value', () => {
    render(<DetailRow label="Email" value="user@example.com" />);
    expect(screen.getByText('Email')).toBeDefined();
    expect(screen.getByText('user@example.com')).toBeDefined();
  });

  it('renders a node value', () => {
    render(<DetailRow label="Status" value={<span>Active</span>} />);
    expect(screen.getByText('Active')).toBeDefined();
  });
});
