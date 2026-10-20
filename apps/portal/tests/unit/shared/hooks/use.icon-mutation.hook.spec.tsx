import { describe, expect, it } from 'bun:test';
import { act, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useIconMutation } from '@/shared/hooks/use.icon-mutation.hook';
import en from '../../../../messages/en.json';

const Providers = ({ children }: { readonly children: ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <Toaster />
    {children}
  </NextIntlClientProvider>
);

const refuseWith = async (serverError: string): Promise<void> => {
  const { result } = renderHook(
    () =>
      useIconMutation(
        () => undefined,
        () => undefined,
      ),
    { wrapper: Providers },
  );
  await act(async () => {
    result.current.runIconMutation(async () => ({ serverError }));
  });
};

describe('useIconMutation when the API refuses', () => {
  it('says the page is locked when the icon cannot change because the page is locked', async () => {
    await refuseWith('locked');

    expect(await screen.findByText(en.errors.reasons.locked)).toBeDefined();
  });

  it('keeps the permission message for any other refusal', async () => {
    await refuseWith('forbidden');

    expect(await screen.findByText(en.pages.permissionError)).toBeDefined();
  });
});
