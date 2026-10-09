/** Imported bare and first: it installs the DOM Mermaid needs before Mermaid loads. */
import './mcp.diagram.dom';
import zenuml from '@mermaid-js/mermaid-zenuml';
import mermaid from 'mermaid';
import { MCP_DIAGRAM_WORKER_READY } from '../../constants/mcp.constants';
import type { McpDiagramCheckAnswer, McpDiagramCheckRequest } from '../../types/mcp.pages.types';
import { mainThread } from './mcp.diagram.dom';

/** The first lines of Mermaid's error say where and what. */
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

// If registering the external diagrams fails, the rejection goes unhandled and the backend sees a worker error.
const learned = mermaid.registerExternalDiagrams([zenuml]);
mainThread.listen('message', (event: MessageEvent<McpDiagramCheckRequest>) => {
  void learned.then(() => check(event.data)).then(mainThread.reply);
});
void learned.then(() => {
  mainThread.reply(MCP_DIAGRAM_WORKER_READY);
});
