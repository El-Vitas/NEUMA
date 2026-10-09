import { GlobalRegistrator } from '@happy-dom/global-registrator';
import type { McpDiagramMainThread } from '../../types/mcp.pages.types';

/** Captured before the fake DOM shadows these globals with ones that reach nothing. */
const captureMainThread = (): McpDiagramMainThread => ({
  listen: globalThis.addEventListener.bind(globalThis),
  reply: globalThis.postMessage.bind(globalThis),
});

export const mainThread = captureMainThread();

// DOMPurify checks for a window on load, and without one several diagram types cannot be parsed.
// Worker only: in the backend process a fake window would make other libraries think they run in a browser.
GlobalRegistrator.register();
