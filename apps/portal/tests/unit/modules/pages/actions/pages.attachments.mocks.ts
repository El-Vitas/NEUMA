import { mock } from 'bun:test';
import { installFetchMock } from '../../../../mocks/global-fetch.mock';

export const cookieState: { value: string | undefined } = { value: undefined };

export const fetchMock = mock(
  async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => new Response(null, { status: 200 }),
);

export const registerAttachmentTestMocks = (): void => {
  mock.module('server-only', () => ({}));
  mock.module('next/headers', () => ({
    cookies: async () => ({ get: () => (cookieState.value === undefined ? undefined : { value: cookieState.value }) }),
    headers: async () => new Headers(),
  }));
  mock.module('@/shared/config', () => ({ config: { backendApiUrl: 'https://backend.test' } }));
  installFetchMock(fetchMock);
};
