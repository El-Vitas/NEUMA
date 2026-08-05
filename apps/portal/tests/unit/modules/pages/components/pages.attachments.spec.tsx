import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

mock.module('@/modules/pages/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => ({ serverError: 'request' }),
  uploadPageAttachmentAction: async () => ({ serverError: 'request' }),
}));

const { PagesAttachments } = await import('@/modules/pages/components/pages.attachments');

const renderAttachments = (attachments: Parameters<typeof PagesAttachments>[0]['attachments'] = []) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesAttachments
        attachments={attachments}
        canEdit
        onAssetDeleted={() => undefined}
        onAssetUploaded={() => undefined}
      />
    </NextIntlClientProvider>,
  );

describe('PagesAttachments', () => {
  it('renders an accessible attachment list with download and delete actions', () => {
    renderAttachments([
      {
        id: '22222222-2222-4222-8222-222222222222',
        mimeType: 'application/pdf',
        originalFilename: 'handbook.pdf',
        size: 1024,
      },
    ]);

    expect(screen.getByRole('list', { name: 'Attachments' })).toBeDefined();
    expect(screen.getByText('handbook.pdf')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Download handbook.pdf' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Delete handbook.pdf' })).toBeDefined();
  });

  it('renders the empty state when the page has no attachments', () => {
    renderAttachments([]);

    expect(screen.getByText('No attachments yet.')).toBeDefined();
    expect(screen.queryByRole('list', { name: 'Attachments' })).toBeNull();
  });

  it('shows a recoverable inline validation error before uploading an unsupported file', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesAttachments
          attachments={[]}
          canEdit
          onAssetDeleted={() => undefined}
          onAssetUploaded={() => undefined}
          pageId="22222222-2222-4222-8222-222222222222"
        />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: { files: [new File(['unsupported'], 'malware.exe', { type: 'application/octet-stream' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(screen.getByRole('alert').textContent).toBe('Choose a valid file before uploading.');
    expect(screen.getByLabelText('Choose a file').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Choose a file').getAttribute('aria-describedby')).toContain('page-attachment-error');
  });
});
