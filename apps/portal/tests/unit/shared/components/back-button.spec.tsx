import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { BackButton } from '@/shared/components/ui/back-button';
import en from '../../../../messages/en.json';

mock.module('../../../../i18n/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
}));

describe('BackButton', () => {
  it('uses the localized common back label when none is provided', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <BackButton />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('button', { name: 'Go back' })).toBeDefined();
  });
});
