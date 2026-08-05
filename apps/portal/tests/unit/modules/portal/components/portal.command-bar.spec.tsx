import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const push = mock(() => undefined);

mock.module('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}));

const { PortalCommandBar } = await import('@/modules/portal/components/portal.command-bar');

describe('PortalCommandBar', () => {
  it('gives the command dialog a localized accessible name', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PortalCommandBar onOpenChange={mock(() => undefined)} open />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('dialog', { name: 'Search' })).toBeDefined();
    expect(screen.getByRole('combobox', { name: 'Search' })).toBeDefined();
  });

  it('opens the canonical search route when Enter submits a query', () => {
    const onOpenChange = mock(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PortalCommandBar onOpenChange={onOpenChange} open />
      </NextIntlClientProvider>,
    );

    const input = screen.getByPlaceholderText('Search');
    fireEvent.change(input, { target: { value: 'onboarding plan' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(push).toHaveBeenCalledWith('/search?query=onboarding%20plan');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
