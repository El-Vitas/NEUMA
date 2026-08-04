import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

mock.module('@/modules/auth/lib/auth.form.lib', () => ({
  submitRegister: async (state: unknown) => state,
}));

const { RegisterForm } = await import('@/modules/auth/components/auth.register.form');

describe('RegisterForm', () => {
  it('renders an accessible password field and a submit button sharing the extracted auth form pieces', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDefined();
  });
});
