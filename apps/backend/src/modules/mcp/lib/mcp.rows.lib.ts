import { ACCESS_TOKEN_PERMISSIONS } from '@neuma/shared';
import type { McpCall, McpRowDescriber, McpServerDependencies } from '../types/mcp.types';
import { readMcpRowPlace } from './mcp.collections.lib';
import { canMcpAct } from './mcp.page-access.lib';
import { describeMcpRowProperties } from './mcp.properties.lib';

const describesNothing: McpRowDescriber = () => [];

/** Column values belong to the collection, so rows have none when its owner cannot see it. */
export const loadMcpRowDescriber = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collectionId: string | null,
): Promise<McpRowDescriber> => {
  if (collectionId === null) return describesNothing;
  const { principal, workspace } = call;
  const [schema, members, collectionPlace] = await Promise.all([
    dependencies.collections.getSchema(collectionId, workspace.id, principal.userId, principal.role),
    dependencies.people.listAssignableMembers(workspace.id),
    dependencies.placeReader.readPlace(collectionId, workspace.id),
  ]);
  if (schema.isFail() || collectionPlace === null) return describesNothing;
  const columns = schema.getValue().properties;
  if (columns.length === 0) return describesNothing;
  const people = new Map(members.map((member) => [member.id, member.name]));
  return (row) =>
    canMcpAct(call, readMcpRowPlace({ place: collectionPlace }, row.id), ACCESS_TOKEN_PERMISSIONS.collectionsRead)
      ? describeMcpRowProperties(columns, row.propertyValues, row.title, people, undefined, row.computedErrors)
      : [];
};
