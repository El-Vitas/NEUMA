import { describe, expect, it } from 'bun:test';
import { cookieState, fetchMock, registerAttachmentTestMocks } from '../actions/pages.attachments.mocks';

registerAttachmentTestMocks();
fetchMock.mockImplementation(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(null, { status: 200, headers: { 'content-type': 'text/plain' } }),
);

const { getPageAttachmentDownload } = await import('@/modules/pages/attachments/server/lib/pages.attachments.server');

describe('getPageAttachmentDownload', () => {
  it('rejects without making an outbound request when there is no access token', async () => {
    cookieState.value = undefined;
    fetchMock.mockClear();

    await expect(getPageAttachmentDownload('22222222-2222-4222-8222-222222222222')).rejects.toThrow(
      'Authentication is required for this action',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads the attachment when authenticated', async () => {
    cookieState.value = 'valid-access-token';
    fetchMock.mockClear();

    const download = await getPageAttachmentDownload('22222222-2222-4222-8222-222222222222');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(download.mimeType).toBe('text/plain');
  });
});
