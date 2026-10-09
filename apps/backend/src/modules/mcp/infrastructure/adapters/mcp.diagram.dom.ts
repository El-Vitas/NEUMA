import { GlobalRegistrator } from '@happy-dom/global-registrator';
import type { McpDiagramMainThread } from '../../types/mcp.pages.types';

/**
 * Cómo habla el worker con el proceso que lo creó, tomado antes de que el DOM
 * simulado tape los globales: la ventana simulada trae su propio `postMessage`
 * y su propio `addEventListener`, que no llegan a ninguna parte.
 */
const captureMainThread = (): McpDiagramMainThread => ({
  listen: globalThis.addEventListener.bind(globalThis),
  reply: globalThis.postMessage.bind(globalThis),
});

export const mainThread = captureMainThread();

/*
  Mermaid limpia lo que dibuja con DOMPurify, y DOMPurify decide al cargarse
  si hay una ventana. Sin una, varios tipos de diagrama ni siquiera se pueden
  leer. La ventana simulada vive solo en este worker: en el proceso del
  backend haría creer a otras librerías que corren en un navegador.
*/
GlobalRegistrator.register();
