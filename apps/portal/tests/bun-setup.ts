import { afterAll, afterEach, beforeAll } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost:3010/' });

const { cleanup } = await import('@testing-library/react');
const { server } = await import('./mocks/server');

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  server.resetHandlers();
});
afterAll(() => server.close());
