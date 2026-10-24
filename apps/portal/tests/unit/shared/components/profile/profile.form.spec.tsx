import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const updateProfileNameAction = mock(async () => ({ data: undefined }));

const push = mock((_href: string) => undefined);
const updatePasswordAction = mock(async (): Promise<{ data: { status: string } | undefined }> => ({ data: undefined }));

mock.module('@/i18n/navigation', () => ({
  useRouter: () => ({ push, refresh: () => undefined }),
}));

mock.module('@/modules/account/server/actions/profile.actions', () => ({
  updateProfileNameAction,
  updatePasswordAction,
}));

const { ProfileForm } = await import('@/shared/components/profile/profile.form');

const baseUser = {
  email: 'ana@example.com',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana',
  role: 'WORKER' as const,
};

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

  it('sends the person to the login when the password changed but no new session could start', async () => {
    updatePasswordAction.mockImplementationOnce(async () => ({ data: { status: 'signInRequired' } }));
    push.mockClear();
    renderForm();
    openDialog();
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-password' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });
});
