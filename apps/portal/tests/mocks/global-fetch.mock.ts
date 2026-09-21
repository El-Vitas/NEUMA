import { beforeAll } from 'bun:test';

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * MSW instala su interceptor sobre `globalThis.fetch` desde el `beforeAll` del
 * preload. Sustituir `fetch` en el cuerpo del módulo lo dejaría por debajo de
 * ese interceptor, que se quedaría con las peticiones; registrarlo como hook
 * lo pone después, y el doble vuelve a recibirlas.
 */
export const installFetchMock = (fetchMock: FetchMock): void => {
  beforeAll(() => {
    globalThis.fetch = Object.assign(fetchMock, { preconnect: (): void => undefined });
  });
};
