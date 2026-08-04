import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const createDatabaseAction = mock(async () => ({ data: undefined }));

mock.module('@/modules/databases/server/actions/databases.actions', () => ({
  createDatabaseAction,
}));

const { DatabasesCreateForm } = await import('@/modules/databases/components/databases.create.form');

const spaces = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Engineering' }];

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DatabasesCreateForm spaces={spaces} />
    </NextIntlClientProvider>,
  );

describe('DatabasesCreateForm', () => {
  it('clears the pending state after the create action rejects, keeping the form usable', async () => {
    createDatabaseAction.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    renderForm();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Roadmap' } });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'roadmap' } });

    const submitButton = screen.getByRole('button', { name: 'Create database' }) as HTMLButtonElement;
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton.disabled).toBe(false));
  });
});
