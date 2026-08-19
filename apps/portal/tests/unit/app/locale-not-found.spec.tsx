import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

mock.module('next-intl/server', () => ({
  getTranslations: async () => (key: string) => {
    const translations: Record<string, string> = {
      goHome: 'Go to the start',
      notFoundBody: 'Check that you typed it correctly, or go back to the start.',
      notFoundTitle: "This address doesn't exist",
    };
    return translations[key] ?? key;
  },
}));
mock.module('@/i18n/navigation', () => ({
  Link: ({ children, href }: { readonly children: ReactNode; readonly href: string }) =>
    createElement('a', { href }, children),
}));

const { default: PortalNotFoundPage } = await import('@/app/[locale]/(portal)/not-found');
const { default: LocaleNotFoundPage } = await import('@/app/[locale]/not-found');

describe('portal not-found boundary', () => {
  it('shows a translated, clear explanation with a way back home', async () => {
    render(await PortalNotFoundPage());

    expect(screen.getByRole('heading', { name: "This address doesn't exist" })).toBeDefined();
    expect(screen.getByText('Check that you typed it correctly, or go back to the start.')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go to the start' }).getAttribute('href')).toBe('/');
  });
});

describe('locale not-found boundary', () => {
  it('shows a translated, clear explanation for an address that matches no route', async () => {
    render(await LocaleNotFoundPage());

    expect(screen.getByRole('heading', { name: "This address doesn't exist" })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Go to the start' }).getAttribute('href')).toBe('/');
  });
});
