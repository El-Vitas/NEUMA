import { isPageDocumentNode, readPageDocumentText } from '@company-brain/shared';
import { MCP_NOT_A_COLLECTION_MESSAGE } from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type { McpCall, McpServerDependencies } from '../types/mcp.types';
import { readMcpNameLister } from './mcp.collections.lib';
import { requireMcpInput, requireMcpSuccess } from './mcp.page-access.lib';
import { readMcpPlace } from './mcp.tool.lib';
import { pickMcpView } from './mcp.views.lib';

/** La colección a la que apunta un bloque: la que muestra incrustada, o a la que un botón le agrega filas. */
const readCollectionTarget = (node: unknown): string | null => {
  if (!isPageDocumentNode(node)) return null;
  const isRowButton = node.type === 'button' && readPageDocumentText(node, 'deed') === 'row';
  if (node.type !== 'collection' && !isRowButton) return null;
  return readPageDocumentText(node, 'pageId') ?? null;
};

const settleTarget = async (dependencies: McpServerDependencies, call: McpCall, node: unknown): Promise<unknown> => {
  if (!isPageDocumentNode(node)) return node;
  const pageId = readCollectionTarget(node);
  if (pageId === null) {
    if (node.content === undefined) return node;
    return { ...node, content: await settleMcpCollectionTargets(dependencies, call, node.content) };
  }
  const { principal, workspace } = call;
  const shape = requireMcpSuccess(
    await dependencies.collections.getSchema(pageId, workspace.id, principal.userId, principal.role),
  );
  if (shape.properties.length === 0) throw new McpToolError(MCP_NOT_A_COLLECTION_MESSAGE);
  const viewName = readPageDocumentText(node, 'viewName');
  if (viewName === undefined) return node;
  const place = await readMcpPlace(dependencies, pageId, workspace.id);
  const view = requireMcpInput(pickMcpView(shape.views, viewName, readMcpNameLister(call, place)));
  return { ...node, attrs: { ...node.attrs, viewName: view.name } };
};

/**
 * Los bloques con cada colección a la que apuntan revisada, también las que
 * van dentro de otro bloque, como una columna: que sea una colección, y que la
 * vista pedida exista, escrita como se llama. Un bloque
 * que mostrara una página sin columnas, o una vista que no está, quedaría roto
 * en la página sin que nadie supiera por qué.
 */
export const settleMcpCollectionTargets = (
  dependencies: McpServerDependencies,
  call: McpCall,
  nodes: readonly unknown[],
): Promise<unknown[]> => Promise.all(nodes.map((node) => settleTarget(dependencies, call, node)));
