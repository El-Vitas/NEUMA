import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorPage from '@/app/error';
import GlobalErrorPage from '@/app/global-error';
import NotFoundPage from '@/app/not-found';
import { BRAND_NAME } from '@/shared/constants/brand.constants';

describe('portal root boundaries', () => {
  it('uses the Company Brain brand constant', () => {
    expect(BRAND_NAME).toBe('Company Brain');
  });

  it('renders English error recovery actions', () => {
    render(<ErrorPage error={new Error()} reset={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeDefined();
  });

  it('renders an English not-found recovery action', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeDefined();
  });

  it('renders the global boundary with English document metadata and recovery copy', () => {
    const markup = renderToStaticMarkup(<GlobalErrorPage error={new Error()} reset={() => undefined} />);

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain('Something went wrong');
    expect(markup).toContain('Try again');
    expect(markup).toContain('Go home');
  });
});
