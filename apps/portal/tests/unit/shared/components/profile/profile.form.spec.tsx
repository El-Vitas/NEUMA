import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const updateProfileNameAction = mock(async () => ({ data: undefined }));

mock.module('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

mock.module('@/modules/account/server/actions/profile.actions', () => ({
  updateProfileNameAction,
  updatePasswordAction: async () => ({ data: undefined }),
}));

const { ProfileForm } = await import('@/shared/components/profile/profile.form');

const baseUser = { email: 'ana@example.com', id: '11111111-1111-4111-8111-111111111111', name: 'Ana', role: 'WORKER' };

const renderForm = (user = baseUser) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ProfileForm user={user} />
    </NextIntlClientProvider>,
  );

const openDialog = () => fireEvent.click(screen.getByRole('button', { name: 'Edit account' }));

describe('ProfileForm', () => {
  it('reflects a changed name prop when the account data is refreshed externally', () => {
    const { rerender } = renderForm();
    openDialog();

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProfileForm user={{ ...baseUser, name: 'Ana Updated' }} />
      </NextIntlClientProvider>,
    );

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana Updated');
  });

  it('does not clobber an in-progress edit when the component re-renders with the same prop', () => {
    const { rerender } = renderForm();
    openDialog();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana typing...' } });

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <ProfileForm user={baseUser} />
      </NextIntlClientProvider>,
    );

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana typing...');
  });
});
