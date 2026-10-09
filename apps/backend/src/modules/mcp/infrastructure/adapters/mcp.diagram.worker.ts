/**
 * Va primero y sin nombres: arma el DOM que Mermaid necesita antes de que
 * Mermaid se cargue, y el orden de las importaciones no mueve una así. Lo que
 * se usa de ese archivo se importa aparte, más abajo.
 */
import './mcp.diagram.dom';
import zenuml from '@mermaid-js/mermaid-zenuml';
import mermaid from 'mermaid';
import { MCP_DIAGRAM_WORKER_READY } from '../../constants/mcp.constants';
import type { McpDiagramCheckAnswer, McpDiagramCheckRequest } from '../../types/mcp.pages.types';
import { mainThread } from './mcp.diagram.dom';

/** Lo que Mermaid dice de un diagrama que no puede leer, en sus primeras líneas: ahí dice dónde y qué. */
const describeFault = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).split('\n').slice(0, 3).join(' ').trim();

const check = async (request: McpDiagramCheckRequest): Promise<McpDiagramCheckAnswer> => {
  try {
    const parsed = await mermaid.parse(request.source);
    return { diagramType: parsed.diagramType, id: request.id };
  } catch (error) {
    return { fault: describeFault(error), id: request.id };
  }
};

/*
  Este archivo corre como worker: lee cada diagrama con el mismo Mermaid que
  lo dibujará el portal, con las mismas familias de diagramas, y contesta si
  se puede leer o por qué no. Si no logra cargar las familias, el rechazo
  queda sin atender y el backend lo recibe como un error del worker.
*/
const learned = mermaid.registerExternalDiagrams([zenuml]);
mainThread.listen('message', (event: MessageEvent<McpDiagramCheckRequest>) => {
  void learned.then(() => check(event.data)).then(mainThread.reply);
});
void learned.then(() => {
  mainThread.reply(MCP_DIAGRAM_WORKER_READY);
});
