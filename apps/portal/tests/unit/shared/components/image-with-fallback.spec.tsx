import { describe, expect, it } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ImageWithFallback } from '@/shared/components/ui/image-with-fallback';
import en from '../../../../messages/en.json';

const renderWithMessages = (component: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      {component}
    </NextIntlClientProvider>,
  );

describe('ImageWithFallback', () => {
  it('renders the image while it loads correctly', () => {
    renderWithMessages(<ImageWithFallback alt="Evidence" height={100} src="/ok.png" width={100} />);
    expect(screen.getByAltText('Evidence')).toBeDefined();
  });

  it('shows an accessible fallback when the image fails to load', () => {
    renderWithMessages(<ImageWithFallback alt="Evidence" height={100} src="/broken.png" width={100} />);
    fireEvent.error(screen.getByAltText('Evidence'));
    expect(screen.getByRole('img', { name: 'Evidence' })).toBeDefined();
  });

  it('uses a generic label when no alt is provided', () => {
    renderWithMessages(<ImageWithFallback alt="" height={100} src="/broken.png" width={100} />);
    const image = document.querySelector('img');
    if (image) fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Image unavailable' })).toBeDefined();
  });
});
