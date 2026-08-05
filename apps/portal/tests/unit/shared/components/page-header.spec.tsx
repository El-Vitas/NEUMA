import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '@/shared/components/ui/page-header';

describe('PageHeader', () => {
  it('renders the title before the subtitle in DOM order', () => {
    render(<PageHeader subtitle="Manage your personal information" title="Account" />);

    const title = screen.getByRole('heading', { level: 1, name: 'Account' });
    const subtitle = screen.getByText('Manage your personal information');

    expect(title.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the action and applies a custom className', () => {
    const { container } = render(
      <PageHeader action={<button type="button">New space</button>} className="custom-class" title="Spaces" />,
    );

    expect(screen.getByRole('button', { name: 'New space' })).toBeDefined();
    expect(container.firstElementChild?.classList.contains('custom-class')).toBe(true);
  });

  it('omits the subtitle paragraph when none is provided', () => {
    const { container } = render(<PageHeader title="Spaces" />);

    expect(container.querySelector('p')).toBeNull();
  });
});
