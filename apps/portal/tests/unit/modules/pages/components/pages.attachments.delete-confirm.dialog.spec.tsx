import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const { PagesAttachmentsDeleteConfirmDialog } = await import(
  '@/modules/pages/attachments/components/pages.attachments.delete-confirm.dialog'
);

describe('PagesAttachmentsDeleteConfirmDialog', () => {
  it('shows the confirmation title and body', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesAttachmentsDeleteConfirmDialog onCancel={() => undefined} onConfirm={() => undefined} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('Delete this attachment?')).toBeDefined();
    expect(screen.getByText('The file will be deleted forever. This cannot be undone.')).toBeDefined();
  });

  it('calls onCancel when Cancel is clicked and onConfirm when Delete is clicked', () => {
    const onCancel = mock(() => undefined);
    const onConfirm = mock(() => undefined);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesAttachmentsDeleteConfirmDialog onCancel={onCancel} onConfirm={onConfirm} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
