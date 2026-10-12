import {
  ACCESS_TOKEN_PERMISSIONS,
  type AccessTokenPermission,
  type AccessTokenPlace,
  canAccessTokenAct,
} from '@neuma/shared';
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

/** Writing does not grant reading, not even through a refusal message. */
export const readMcpNameLister = (call: McpCall, place: AccessTokenPlace): McpNameLister =>
  canMcpAct(call, place, ACCESS_TOKEN_PERMISSIONS.collectionsRead) ? listMcpNames : hideMcpNames;

const isCollectionPage = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  pageId: string,
): Promise<boolean> => {
  const { principal, workspace } = call;
  const schema = await dependencies.collections.getSchema(pageId, workspace.id, principal.userId, principal.role);
  return schema.isOk() && isCollectionShape(schema.getValue());
};

/** Page tools that create, rename, move or copy a row also need collection write permission at the row's place. */
export const requireMcpRowChangeAllowed = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: { readonly parentId: string | null; readonly place: AccessTokenPlace },
): Promise<void> => {
  if (row.parentId === null || !(await isCollectionPage(dependencies, call, row.parentId))) return;
  requireMcpPermissionAt(call.principal, row.place, ACCESS_TOKEN_PERMISSIONS.collectionsWrite);
};

/** Permission first: saying "not a collection" about a closed page would already leak something. */
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

/** Permission is checked on the row, since that is what gets written; the collection is only read for its columns. */
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

/** Carries the shape read on open: if someone changed it meanwhile, nothing is overwritten and the agent rereads. */
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

export const requireMcpView = (collection: McpOpenCollection, name: string): McpView =>
  requireMcpInput(pickMcpView(collection.shape.views, name, collection.listNames));

export const readMcpColumnsInHand = (collection: {
  readonly listNames: McpNameLister;
  readonly shape: McpCollectionShape;
}): McpColumnsInHand => ({ columns: collection.shape.properties, listNames: collection.listNames });

/** The row's place is the collection's with the row on top, so a rule set on the row overrides the collection's. */
export const canMcpActOnRow = (
  call: McpCall,
  collection: McpOpenCollection,
  rowId: string,
  permission: AccessTokenPermission,
): boolean =>
  canAccessTokenAct(call.principal.access, call.principal.role, readMcpRowPlace(collection, rowId), permission);

/** Cells need collection read, the title needs page read; writing a row does not grant reading it. */
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

/** Columns and views need collection read, the title needs page read; configuring does not grant reading. */
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

export const readMcpRowPlace = (collection: { readonly place: AccessTokenPlace }, rowId: string): AccessTokenPlace => ({
  lineage: [rowId, ...collection.place.lineage],
  spaceId: collection.place.spaceId,
});

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
