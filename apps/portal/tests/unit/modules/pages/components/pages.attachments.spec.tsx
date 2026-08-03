import { describe, expect, it, mock } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

mock.module('@/modules/pages/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ ok: true }),
  downloadPageAttachmentAction: async () => ({ ok: false, error: 'request' }),
  uploadPageAttachmentAction: async () => ({ ok: false, error: 'request' }),
}));

const { PagesAttachments } = await import('@/modules/pages/components/pages.attachments');

const renderAttachments = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesAttachments
        attachments={[
          {
            id: '22222222-2222-4222-8222-222222222222',
            mimeType: 'application/pdf',
            originalFilename: 'handbook.pdf',
            size: 1024,
          },
        ]}
        canEdit
      />
    </NextIntlClientProvider>,
  );

describe('PagesAttachments', () => {
  it('renders an accessible attachment list with download and delete actions', () => {
    renderAttachments();

    expect(screen.getByRole('list', { name: 'Attachments' })).toBeDefined();
    expect(screen.getByText('handbook.pdf')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Download handbook.pdf' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete handbook.pdf' })).toBeDefined();
  });
});
