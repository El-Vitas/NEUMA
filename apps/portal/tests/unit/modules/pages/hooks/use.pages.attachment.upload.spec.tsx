import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import en from '../../../../../messages/en.json';

let resolveUpload: ((value: unknown) => void) | undefined;

mock.module('@/modules/pages/attachments/server/actions/pages.attachments.actions', () => ({
  uploadPageAttachmentAction: () =>
    new Promise((resolve) => {
      resolveUpload = resolve;
    }),
}));

const { usePagesAttachmentUpload } = await import('@/modules/pages/attachments/hooks/use.pages.attachment.upload');

const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {children}
  </NextIntlClientProvider>
);

describe('usePagesAttachmentUpload', () => {
  it('rejects a file larger than the allowed size without calling the upload action', () => {
    const onUploaded = mock(() => undefined);
    const { result, unmount } = renderHook(
      () => usePagesAttachmentUpload({ onUploaded, pageId: '11111111-1111-4111-8111-111111111111' }),
      { wrapper },
    );

    const oversizedFile = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' });
    act(() => {
      result.current.upload(oversizedFile);
    });

    expect(result.current.error).toBe('tooLarge');
    expect(onUploaded).not.toHaveBeenCalled();
    unmount();
  });

  it('is pending while the upload is in flight and reports the uploaded attachment once it succeeds', async () => {
    const onUploaded = mock(() => undefined);
    const { result, unmount } = renderHook(
      () => usePagesAttachmentUpload({ onUploaded, pageId: '11111111-1111-4111-8111-111111111111' }),
      { wrapper },
    );

    const file = new File(['content'], 'note.txt', { type: 'text/plain' });
    act(() => {
      result.current.upload(file);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolveUpload?.({
      data: {
        id: 'attachment-1',
        mimeType: 'text/plain',
        originalFilename: 'note.txt',
        size: 7,
        uploadedBy: 'Jane Doe',
      },
    });

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    /** The attachment is reported from inside the transition, which React ends a tick later. */
    await waitFor(() => expect(result.current.isPending).toBe(false));
    unmount();
  });
});
