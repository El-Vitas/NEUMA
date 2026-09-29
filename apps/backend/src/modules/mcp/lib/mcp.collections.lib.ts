import {
  type AccessTokenPermission,
  type AccessTokenPlace,
  canAccessTokenAct,
  type Result,
} from '@company-brain/shared';
import {
  MCP_CONCURRENT_CHANGE_MESSAGE,
  MCP_CONCURRENT_REFUSAL_CODES,
  MCP_INACCESSIBLE_MESSAGE,
  MCP_INACCESSIBLE_REFUSAL_CODES,
  MCP_LOCKED_REFUSAL_CODE,
  MCP_NOT_A_COLLECTION_MESSAGE,
  MCP_NOT_A_ROW_MESSAGE,
  MCP_PAGE_LOCKED_MESSAGE,
  MCP_REFUSED_CHANGE_PREFIX,
  MCP_UNREADABLE_ADDRESS_MESSAGE,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpCollectionShape,
  McpOpenCollection,
  McpRefusal,
  McpRowOutput,
  McpView,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpPageSource, McpPerson, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl, readMcpAddress } from './mcp.address.lib';
import { foldMcpName } from './mcp.columns.lib';
import { describeMcpRowProperties } from './mcp.properties.lib';
import { readMcpPlace, requireMcpPermissionAt } from './mcp.tool.lib';

/** La página de un enlace o de un id; si no es ninguno de los dos, un fallo que dice qué pasar. */
export const readMcpPageId = (address: string): string => {
  const read = readMcpAddress(address);
  switch (read.kind) {
    case 'page':
      return read.pageId;
    case 'id':
      return read.id;
    default:
      throw new McpToolError(MCP_UNREADABLE_ADDRESS_MESSAGE);
  }
};

/**
 * Por qué el servicio no hizo lo pedido, dicho para que el agente sepa qué
 * hacer: lo que no ve suena igual que lo que no existe, lo bloqueado pide a
 * una persona, y lo que alguien cambió mientras tanto pide volver a leer.
 */
const explainRefusal = (refusal: McpRefusal): string => {
  if (MCP_INACCESSIBLE_REFUSAL_CODES.includes(refusal.code)) return MCP_INACCESSIBLE_MESSAGE;
  if (refusal.code === MCP_LOCKED_REFUSAL_CODE) return MCP_PAGE_LOCKED_MESSAGE;
  if (typeof refusal.details === 'string') return `${MCP_REFUSED_CHANGE_PREFIX} ${refusal.details}`;
  if (MCP_CONCURRENT_REFUSAL_CODES.includes(refusal.code)) return MCP_CONCURRENT_CHANGE_MESSAGE;
  return `${MCP_REFUSED_CHANGE_PREFIX} ${refusal.details === undefined ? refusal.code : JSON.stringify(refusal.details)}`;
};

/** Lo que devolvió el servicio, o un fallo que el agente puede leer. */
export const requireMcpSuccess = <TValue>(result: Result<TValue, McpRefusal>): TValue => {
  if (result.isFail()) throw new McpToolError(explainRefusal(result.getError()));
  return result.getValue();
};

/** Un texto que el agente escribió y que Company Brain rechazaría, dicho antes de llegar a escribir. */
export const requireMcpInput = <TValue>(result: Result<TValue, string>): TValue => {
  if (result.isFail()) throw new McpToolError(result.getError());
  return result.getValue();
};

/** Las columnas y las vistas de una página, si su dueño la ve. Una página sin columnas no es una colección. */
const readShape = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
): Promise<McpCollectionShape> => {
  const { principal, workspace } = call;
  const schema = requireMcpSuccess(
    await dependencies.collections.getSchema(pageId, workspace.id, principal.userId, principal.role),
  );
  return { properties: schema.properties, views: schema.views };
};

const isCollectionShape = (shape: McpCollectionShape): boolean => shape.properties.length > 0;

/** Una página que su dueño ve, con el permiso del token revisado donde está hoy. */
const openMcpPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
  permission: AccessTokenPermission,
): Promise<{ readonly page: McpPageSource; readonly place: AccessTokenPlace }> => {
  const { principal, workspace } = call;
  const [page, place] = await Promise.all([
    dependencies.pagesService.getAccessible(pageId, workspace.id, principal.userId, principal.role),
    readMcpPlace(dependencies, pageId, workspace.id),
  ]);
  if (page.isFail()) throw new McpToolError(MCP_INACCESSIBLE_MESSAGE);
  requireMcpPermissionAt(principal, place, permission);
  return { page: page.getValue(), place };
};

/**
 * La colección que el agente nombró, si su dueño la ve y la regla más cercana
 * del token da ese permiso donde está hoy.
 *
 * El permiso se revisa antes de mirar si tiene columnas: decir «no es una
 * colección» de una página cerrada ya contaría algo de ella.
 */
export const openMcpCollection = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  address: string,
  permission: AccessTokenPermission,
): Promise<McpOpenCollection> => {
  const { page, place } = await openMcpPage(dependencies, call, readMcpPageId(address), permission);
  const shape = await readShape(dependencies, call, page.id);
  if (!isCollectionShape(shape)) throw new McpToolError(MCP_NOT_A_COLLECTION_MESSAGE);
  return { id: page.id, place, shape, spaceId: page.spaceId, title: page.title };
};

/**
 * Una fila que el agente nombró y la colección de la que cuelga.
 *
 * El permiso se mira en la fila, porque es lo que se escribe; la colección
 * solo se lee para saber qué columnas tiene.
 */
export const openMcpRow = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  address: string,
  permission: AccessTokenPermission,
): Promise<{ readonly row: McpPageSource; readonly shape: McpCollectionShape }> => {
  const { page: row } = await openMcpPage(dependencies, call, readMcpPageId(address), permission);
  if (row.parentId === null) throw new McpToolError(MCP_NOT_A_ROW_MESSAGE);
  const shape = await readShape(dependencies, call, row.parentId);
  if (!isCollectionShape(shape)) throw new McpToolError(MCP_NOT_A_ROW_MESSAGE);
  return { row, shape };
};

/**
 * Guarda la forma entera de la colección por el mismo servicio que usa el
 * portal, con sus validaciones, y devuelve la colección como quedó.
 */
export const saveMcpCollectionShape = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  shape: McpCollectionShape,
): Promise<McpOpenCollection> => {
  const { principal, workspace } = call;
  const saved = requireMcpSuccess(
    await dependencies.collections.defineSchema({
      pageId: collection.id,
      properties: shape.properties,
      role: principal.role,
      userId: principal.userId,
      views: shape.views,
      workspaceId: workspace.id,
    }),
  );
  return { ...collection, shape: { properties: saved.properties, views: saved.views } };
};

/** Una vista de la colección por su nombre, como sea que venga escrito, o por qué no está y cuáles sí. */
export const requireMcpView = (collection: McpOpenCollection, name: string): McpView => {
  const view = collection.shape.views.find((candidate) => foldMcpName(candidate.name) === foldMcpName(name));
  if (view !== undefined) return view;
  const names = collection.shape.views.map((candidate) => candidate.name).join(', ');
  throw new McpToolError(`The collection has no view "${name}". Its views are: ${names}.`);
};

/**
 * Si el token deja hacer eso en una fila de la colección. La fila cuelga de la
 * colección, así que su lugar es el de la colección con ella misma encima: una
 * regla puesta en la fila manda sobre la de la colección.
 */
export const canMcpActOnRow = (
  call: McpCall,
  collection: McpOpenCollection,
  rowId: string,
  permission: AccessTokenPermission,
): boolean =>
  canAccessTokenAct(
    call.principal.access,
    call.principal.role,
    { lineage: [rowId, ...collection.place.lineage], spaceId: collection.place.spaceId },
    permission,
  );

/** Una fila como la devuelve toda herramienta que la escribe o la lee: sus propiedades con nombre y su enlace. */
export const describeMcpRow = (
  portalUrl: string,
  shape: McpCollectionShape,
  row: McpWrittenRow,
  people: readonly McpPerson[],
): McpRowOutput => ({
  id: row.id,
  properties: describeMcpRowProperties(
    shape.properties,
    row.propertyValues,
    row.title,
    new Map(people.map((person) => [person.id, person.name])),
  ),
  title: row.title,
  url: buildMcpPageUrl(portalUrl, row.spaceId, row.id, null),
});
