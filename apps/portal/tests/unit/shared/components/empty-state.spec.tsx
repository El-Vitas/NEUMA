import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/shared/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders a generic container with its message and action', () => {
    const { container } = render(
      <EmptyState action={<button type="button">Create space</button>} className="custom-class" message="No spaces" />,
    );

    expect(container.querySelector('div')).not.toBeNull();
    expect(container.querySelector('td')).toBeNull();
    expect(screen.getByText('No spaces').textContent).toBe('No spaces');
    expect(screen.getByRole('button', { name: 'Create space' }).textContent).toBe('Create space');
    expect(container.firstElementChild?.classList.contains('custom-class')).toBe(true);
  });
});
