import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPermission,
  type AccessTokenPlace,
  canAccessTokenAct,
} from '@company-brain/shared';
import {
  MCP_NOT_A_COLLECTION_MESSAGE,
  MCP_NOT_A_ROW_MESSAGE,
  MCP_REDACTED_REFERENCE_LABEL,
} from '../constants/mcp.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpCollectionOutput,
  McpCollectionShape,
  McpColumnsInHand,
  McpNameLister,
  McpOpenCollection,
  McpRowOutput,
  McpView,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpOpenRow, McpPerson, McpServerDependencies } from '../types/mcp.types';
import { buildMcpPageUrl } from './mcp.address.lib';
import { describeMcpCollection } from './mcp.collection-output.lib';
import { hideMcpNames, listMcpNames } from './mcp.columns.lib';
import { canMcpAct, openMcpPage, readMcpPageId, requireMcpInput, requireMcpSuccess } from './mcp.page-access.lib';
import { describeMcpRowProperties } from './mcp.properties.lib';
import { requireMcpPermissionAt } from './mcp.tool.lib';
import { pickMcpView } from './mcp.views.lib';

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

/**
 * Cómo se nombra lo que hay en una colección cuando el agente pide algo que no
 * está: con todo, si el token puede leer colecciones ahí; sin nada, si solo
 * puede cambiarla. Escribir no da derecho a leer, tampoco por un rechazo.
 */
export const readMcpNameLister = (call: McpCall, place: AccessTokenPlace): McpNameLister =>
  canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.collectionsRead) ? listMcpNames : hideMcpNames;

/** Si una página tiene columnas: las que cuelgan de ella son filas. */
const isCollectionPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
): Promise<boolean> => {
  const { principal, workspace } = call;
  const schema = await dependencies.collections.getSchema(pageId, workspace.id, principal.userId, principal.role);
  return schema.isOk() && isCollectionShape(schema.getValue());
};

/**
 * Una página que cuelga de una colección es una fila. Crearla, renombrarla,
 * moverla o copiarla por las herramientas de páginas cambia filas igual que
 * create_row, así que pide además escribir en colecciones, en el lugar de la
 * fila. Lo que dice una fila por dentro sigue siendo escribir una página.
 */
export const requireMcpRowChangeAllowed = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: { readonly parentId: string | null; readonly place: AccessTokenPlace },
): Promise<void> => {
  if (row.parentId === null || !(await isCollectionPage(dependencies, call, row.parentId))) return;
  requireMcpPermissionAt(call.principal, row.place, ACCESS_TOKEN_PERMISSIONS.collectionsWrite);
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
  return {
    id: page.id,
    listNames: readMcpNameLister(call, place),
    place,
    shape,
    spaceId: page.spaceId,
    title: page.title,
  };
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
): Promise<McpOpenRow> => {
  const { page: row, place } = await openMcpPage(dependencies, call, readMcpPageId(address), permission);
  if (row.parentId === null) throw new McpToolError(MCP_NOT_A_ROW_MESSAGE);
  const shape = await readShape(dependencies, call, row.parentId);
  if (!isCollectionShape(shape)) throw new McpToolError(MCP_NOT_A_ROW_MESSAGE);
  return { listNames: readMcpNameLister(call, place), place, row, shape };
};

/**
 * Guarda la forma entera de la colección por el mismo servicio que usa el
 * portal, con sus validaciones, y devuelve la colección como quedó. Lleva la
 * forma que se leyó al abrirla: si otra persona la cambió entretanto, no se
 * guarda encima, y el agente vuelve a leerla.
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
      readShape: collection.shape,
      role: principal.role,
      userId: principal.userId,
      views: shape.views,
      workspaceId: workspace.id,
    }),
  );
  return { ...collection, shape: { properties: saved.properties, views: saved.views } };
};

/** Una colección abierta junto con las personas del espacio de trabajo, para leer o escribir columnas de personas por nombre. */
export const openMcpCollectionWithPeople = (
  dependencies: McpServerDependencies,
  call: McpCall,
  address: string,
  permission: AccessTokenPermission,
): Promise<readonly [McpOpenCollection, readonly McpPerson[]]> =>
  Promise.all([
    openMcpCollection(dependencies, call, address, permission),
    dependencies.people.listAssignableMembers(call.workspace.id),
  ]);

/** Una vista de la colección por su nombre, como sea que venga escrito, o por qué no está y, si se puede saber, cuáles sí. */
export const requireMcpView = (collection: McpOpenCollection, name: string): McpView =>
  requireMcpInput(pickMcpView(collection.shape.views, name, collection.listNames));

/** Las columnas de una colección abierta, con cómo nombrarlas en un rechazo. */
export const readMcpColumnsInHand = (collection: {
  readonly listNames: McpNameLister;
  readonly shape: McpCollectionShape;
}): McpColumnsInHand => ({ columns: collection.shape.properties, listNames: collection.listNames });

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
  canAccessTokenAct(call.principal.access, call.principal.role, readMcpRowPlace(collection, rowId), permission);

/**
 * Una fila como la ve el token donde está: lo que tiene en cada columna solo
 * si puede leer colecciones ahí, y su título solo si puede leer la página.
 * Escribir en una fila no da derecho a leerla.
 */
export const describeMcpRowAsSeen = (
  portalUrl: string,
  call: McpCall,
  seen: { readonly place: AccessTokenPlace; readonly shape: McpCollectionShape },
  row: McpWrittenRow,
  people: readonly McpPerson[],
): McpRowOutput => {
  const described = describeMcpRow(portalUrl, seen.shape, row, people);
  if (canMcpAct(call, seen.place, ACCESS_TOKEN_PERMISSIONS.collectionsRead)) return described;
  const title = canMcpAct(call, seen.place, ACCESS_TOKEN_PERMISSIONS.pagesRead)
    ? described.title
    : MCP_REDACTED_REFERENCE_LABEL;
  return { ...described, properties: [], title };
};

/**
 * Una colección recién cambiada, tal como el token puede verla: sus columnas y
 * sus vistas solo si puede leer colecciones ahí, y su título solo si puede leer
 * la página. Configurar no da derecho a leer.
 */
export const describeMcpCollectionAsSeen = (
  portalUrl: string,
  call: McpCall,
  collection: McpOpenCollection,
): McpCollectionOutput => {
  const described = describeMcpCollection(portalUrl, collection);
  if (canMcpAct(call, collection.place, ACCESS_TOKEN_PERMISSIONS.collectionsRead)) return described;
  const title = canMcpAct(call, collection.place, ACCESS_TOKEN_PERMISSIONS.pagesRead)
    ? described.title
    : MCP_REDACTED_REFERENCE_LABEL;
  return { ...described, columns: [], title, views: [] };
};

/** El lugar de una fila: el de su colección, con la fila delante, para que su propia regla mande. */
export const readMcpRowPlace = (collection: { readonly place: AccessTokenPlace }, rowId: string): AccessTokenPlace => ({
  lineage: [rowId, ...collection.place.lineage],
  spaceId: collection.place.spaceId,
});

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
