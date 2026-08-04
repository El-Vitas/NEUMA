import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const createUserAction = mock(async () => ({ data: undefined }));

mock.module('@/modules/users/server/actions/users.actions', () => ({
  createUserAction,
}));

const { UsersCreateDialog } = await import('@/modules/users/components/users.create.dialog');

const renderDialog = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <UsersCreateDialog />
    </NextIntlClientProvider>,
  );

const fillValidForm = () => {
  fireEvent.click(screen.getByRole('button', { name: 'New user' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana Lopez' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'supersecret' } });
};

describe('UsersCreateDialog', () => {
  it('clears the pending state after the create action rejects, keeping the dialog usable', async () => {
    createUserAction.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    renderDialog();
    fillValidForm();

    const createButton = screen.getByRole('button', { name: 'Create user' }) as HTMLButtonElement;
    fireEvent.click(createButton);

    await waitFor(() => expect(createButton.disabled).toBe(false));
  });
});
