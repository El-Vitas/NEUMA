import { describe, expect, it } from 'bun:test';
import { cookieState, fetchMock, registerAttachmentTestMocks } from '../actions/pages.attachments.mocks';

registerAttachmentTestMocks();
fetchMock.mockImplementation(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
    new Response(null, { status: 200, headers: { 'content-type': 'text/plain' } }),
);

const { getPageAttachmentDownload, uploadPageAttachmentAsset } = await import(
  '@/modules/pages/attachments/server/lib/pages.attachments.server'
);
const { NetworkError } = await import('@/shared/lib/parse-json-body');

/** No llegar al backend es estar sin conexión, y así se tiene que poder leer: no como un error del código. */
describe('an attachment request that never reaches the backend', () => {
  const unreachable = async (): Promise<Response> => {
    throw new TypeError('fetch failed');
  };

  it('says so when downloading', async () => {
    cookieState.value = 'valid-access-token';
    fetchMock.mockImplementationOnce(unreachable);

    await expect(getPageAttachmentDownload('22222222-2222-4222-8222-222222222222')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  it('says so when uploading', async () => {
    fetchMock.mockImplementationOnce(unreachable);

    await expect(
      uploadPageAttachmentAsset('22222222-2222-4222-8222-222222222222', new File(['x'], 'x.txt'), 'token'),
    ).rejects.toBeInstanceOf(NetworkError);
  });
});

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
