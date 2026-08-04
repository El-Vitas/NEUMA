import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const updateUserNameAction = mock(async () => ({ data: undefined }));

mock.module('@/modules/users/server/actions/users.actions', () => ({
  updateUserNameAction,
}));

const { UsersEditDialog } = await import('@/modules/users/components/users.edit.dialog');

const baseUser = {
  createdAt: '2024-01-01T00:00:00.000Z',
  email: 'ana@example.com',
  id: '11111111-1111-4111-8111-111111111111',
  isActive: true,
  name: 'Ana',
  role: 'WORKER' as const,
};

const renderDialog = (user = baseUser) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <UsersEditDialog user={user} />
    </NextIntlClientProvider>,
  );

const openDialog = () => fireEvent.click(screen.getByRole('button', { name: 'Edit Ana' }));

describe('UsersEditDialog', () => {
  it('reflects a changed name prop when it is not the one currently being edited', () => {
    const { rerender } = renderDialog();
    openDialog();

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <UsersEditDialog user={{ ...baseUser, name: 'Ana Updated' }} />
      </NextIntlClientProvider>,
    );

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana Updated');
  });

  it('does not clobber an in-progress edit when the component re-renders with the same prop', () => {
    const { rerender } = renderDialog();
    openDialog();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana typing...' } });

    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <UsersEditDialog user={baseUser} />
      </NextIntlClientProvider>,
    );

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana typing...');
  });

  it('clears the pending state after the update action rejects, keeping the dialog usable', async () => {
    updateUserNameAction.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana Retry' } });
    const saveButton = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton.disabled).toBe(false));
  });
});
