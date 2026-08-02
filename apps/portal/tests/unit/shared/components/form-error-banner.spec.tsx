import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { FormErrorBanner } from '@/shared/components/ui/form-error-banner';

describe('FormErrorBanner', () => {
  it('renders the message inside an alert role', () => {
    render(<FormErrorBanner message="No se pudo guardar" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('No se pudo guardar');
  });
});
