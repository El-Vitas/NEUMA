import { beforeAll } from 'bun:test';

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * MSW installs its interceptor on `globalThis.fetch` in the preload's `beforeAll`. Replacing `fetch` in the module
 * body would sit under that interceptor and never see requests; registering it as a hook runs it afterwards.
 */
export const installFetchMock = (fetchMock: FetchMock): void => {
  beforeAll(() => {
    globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });
  });
};
