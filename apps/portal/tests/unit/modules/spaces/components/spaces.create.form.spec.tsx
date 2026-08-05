import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const createSpaceAction = mock(async () => ({ data: undefined }));

mock.module('next/navigation', () => ({
  useRouter: () => ({ replace: () => undefined }),
}));

mock.module('@/modules/spaces/server/actions/spaces.actions', () => ({
  createSpaceAction,
}));

const { SpacesCreateForm } = await import('@/modules/spaces/components/spaces.create.form');

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SpacesCreateForm />
    </NextIntlClientProvider>,
  );

describe('SpacesCreateForm', () => {
  it('shows an inline, specific error once the name field is left empty', () => {
    renderForm();

    fireEvent.blur(screen.getByLabelText('Name'));

    expect(screen.getByRole('alert').textContent).toBe('Name is too short.');
  });

  it('shows an inline, specific error once the slug field is left empty', () => {
    renderForm();

    fireEvent.blur(screen.getByLabelText('Slug'));

    expect(screen.getByRole('alert').textContent).toBe('Enter a slug.');
  });

  it('disables the submit button while the name is invalid', () => {
    renderForm();

    expect((screen.getByRole('button', { name: 'Create space' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears the pending state after the create action rejects, keeping the form usable', async () => {
    createSpaceAction.mockImplementationOnce(() => Promise.reject(new Error('network down')));
    renderForm();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Engineering' } });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'engineering' } });

    const submitButton = screen.getByRole('button', { name: 'Create space' }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    fireEvent.click(submitButton);

    expect((screen.getByRole('button', { name: 'Creating space...' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(submitButton.disabled).toBe(false));
  });
});
