import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import en from '../../../../../messages/en.json';

const downloadResult = {
  data: {
    body: [104, 105],
    mimeType: 'text/plain',
    originalFilename: 'note.txt',
  },
};

mock.module('@/modules/pages/server/actions/pages.attachments.actions', () => ({
  deletePageAttachmentAction: async () => ({ data: undefined }),
  downloadPageAttachmentAction: async () => downloadResult,
}));

const { PagesAttachmentItem } = await import('@/modules/pages/components/pages.attachment.item');

const attachment = {
  id: '22222222-2222-4222-8222-222222222222',
  mimeType: 'text/plain',
  originalFilename: 'note.txt',
  size: 128,
};

describe('PagesAttachmentItem download', () => {
  it('revokes the created object url after triggering the download', async () => {
    const createObjectURL = mock((_object: Blob | MediaSource): string => 'blob:mock-url');
    const revokeObjectURL = mock((_url: string): void => undefined);
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PagesAttachmentItem attachment={attachment} canEdit={false} onDeleted={() => {}} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download note.txt' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
