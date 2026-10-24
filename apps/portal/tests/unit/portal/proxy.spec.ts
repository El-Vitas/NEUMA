import { describe, expect, it, mock } from 'bun:test';
import { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/shared/constants/auth.constants';
import { installFetchMock } from '../../mocks/global-fetch.mock';

const renewedSession = {
  accessToken: 'new-access',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'rotated-refresh',
  refreshTokenExpiresInSeconds: 3600,
  user: { email: 'ana@example.com', id: 'user-1', name: 'Ana', role: 'ADMIN' as const },
};

const fetchMock = mock(
  async (): Promise<Response> =>
    new Response(JSON.stringify(renewedSession), { headers: { 'content-type': 'application/json' }, status: 201 }),
);

mock.module('@/shared/config', () => ({
  config: {
    backendApiUrl: 'https://backend.test',
    clientIpTrust: { trustedProxyCount: 0, trustsCloudflareHeader: false },
    nodeEnv: 'test',
  },
}));
installFetchMock(fetchMock);

const { proxy } = await import('../../../proxy');

const spentAccessToken = `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.signature`;

describe('proxy', () => {
  it('stores the rotated refresh token next to the new access token, so the next renewal sends the new one', async () => {
    const request = new NextRequest('http://localhost/spaces');
    request.cookies.set(ACCESS_TOKEN_COOKIE, spentAccessToken);
    request.cookies.set(REFRESH_TOKEN_COOKIE, 'old-refresh');

    const response = await proxy(request);

    expect(response.headers.get('location')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe('rotated-refresh');
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe('new-access');
  });
});
