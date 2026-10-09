import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import ErrorPage from '@/app/error';
import GlobalErrorPage from '@/app/global-error';
import NotFoundPage from '@/app/not-found';
import { BRAND_NAME } from '@/shared/constants/brand.constants';

describe('portal root boundaries', () => {
  it('uses the Neuma brand constant', () => {
    expect(BRAND_NAME).toBe('Neuma');
  });

  it('renders English error recovery actions', () => {
    render(<ErrorPage error={new Error()} reset={() => undefined} />);

    expect(screen.getByRole('heading', { name: 'This page could not be opened' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go to the start' })).toBeDefined();
  });

  it('never repeats to the reader what the exception said', () => {
    const technical = 'ZodError: {"code":"custom","path":["content",0,"type"]}';
    render(<ErrorPage error={new Error(technical)} reset={() => undefined} />);

    expect(document.body.textContent).not.toContain(technical);
    expect(document.body.textContent).not.toContain('ZodError');
  });

  it('offers the digest instead, which leads to the cause without spelling it out', () => {
    const failure: Error & { digest?: string } = new Error('unreadable to a reader');
    failure.digest = 'a1b2c3';
    render(<ErrorPage error={failure} reset={() => undefined} />);

    expect(document.body.textContent).toContain('a1b2c3');
    expect(document.body.textContent).not.toContain('unreadable to a reader');
  });

  it('renders an English not-found recovery action', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go home' })).toBeDefined();
  });

  it('renders the global boundary with English document metadata and recovery copy', () => {
    const markup = renderToStaticMarkup(<GlobalErrorPage error={new Error()} reset={() => undefined} />);

    expect(markup).toContain('<html lang="en">');
    expect(markup).toContain('This page could not be opened');
    expect(markup).toContain('Try again');
    expect(markup).toContain('Go to the start');
  });
});
