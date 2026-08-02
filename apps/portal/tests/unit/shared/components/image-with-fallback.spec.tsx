import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';

describe('ImageWithFallback', () => {
  it('renders the image while it loads correctly', () => {
    render(<ImageWithFallback alt="Evidencia" height={100} src="/ok.png" width={100} />);
    expect(screen.getByAltText('Evidencia')).toBeDefined();
  });

  it('shows an accessible fallback when the image fails to load', () => {
    render(<ImageWithFallback alt="Evidencia" height={100} src="/broken.png" width={100} />);
    fireEvent.error(screen.getByAltText('Evidencia'));
    expect(screen.getByRole('img', { name: 'Evidencia' })).toBeDefined();
  });

  it('uses a generic label when no alt is provided', () => {
    render(<ImageWithFallback alt="" height={100} src="/broken.png" width={100} />);
    const image = document.querySelector('img');
    if (image) fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Imagen no disponible' })).toBeDefined();
  });
});
