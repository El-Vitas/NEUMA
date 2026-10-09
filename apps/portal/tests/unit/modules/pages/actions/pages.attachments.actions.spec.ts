import { describe, expect, it, mock } from 'bun:test';
import { createSafeActionMock } from '../../../../mocks/safe-action.mock';
import { cookieState, fetchMock, registerAttachmentTestMocks } from './pages.attachments.mocks';

const updateTagMock = mock(() => undefined);

registerAttachmentTestMocks();
mock.module('next/cache', () => ({ updateTag: updateTagMock }));
mock.module('@/lib/safe-action', createSafeActionMock);
mock.module('@/shared/lib/with-action.lib', () => ({
  withAction: async (_meta: unknown, operation: () => Promise<unknown>) => operation(),
}));

const { deletePageAttachmentAction, uploadPageAttachmentAction } = await import(
  '@/modules/pages/attachments/server/actions/pages.attachments.actions'
);

const attachmentId = '22222222-2222-4222-8222-222222222222';

describe('uploadPageAttachmentAction', () => {
  it('rejects without making an outbound request when there is no access token', async () => {
    cookieState.value = undefined;
    fetchMock.mockClear();

    const result = await uploadPageAttachmentAction({
      file: new File(['content'], 'note.txt', { type: 'text/plain' }),
      pageId: attachmentId,
    });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads the file and invalidates the cache when authenticated', async () => {
    cookieState.value = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();
    const attachment = {
      id: attachmentId,
      mimeType: 'text/plain',
      originalFilename: 'note.txt',
      size: 7,
      uploadedBy: 'Jane Doe',
    };
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify(attachment), { status: 200 }));

    const result = await uploadPageAttachmentAction({
      file: new File(['content'], 'note.txt', { type: 'text/plain' }),
      pageId: attachmentId,
    });

    expect(result).toEqual({ data: attachment });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('page-attachments');
  });
});

describe('deletePageAttachmentAction', () => {
  it('rejects without making an outbound request when there is no access token', async () => {
    cookieState.value = undefined;
    fetchMock.mockClear();
    updateTagMock.mockClear();

    const result = await deletePageAttachmentAction({ attachmentId });

    expect(result).toEqual({ serverError: 'forbidden' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('deletes the attachment and invalidates the cache when authenticated', async () => {
    cookieState.value = 'valid-access-token';
    fetchMock.mockClear();
    updateTagMock.mockClear();
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify({ deleted: true }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
    );

    const result = await deletePageAttachmentAction({ attachmentId });

    expect(result).toEqual({ data: undefined });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(updateTagMock).toHaveBeenCalledWith('page-attachments');
  });
});
