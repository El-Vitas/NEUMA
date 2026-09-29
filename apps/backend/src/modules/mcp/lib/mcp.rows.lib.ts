import type { PagePropertyValues } from '@company-brain/shared';
import type { McpCall, McpRowDescriber, McpServerDependencies } from '../types/mcp.types';
import { describeMcpRowProperties } from './mcp.properties.lib';

const describesNothing: McpRowDescriber = () => [];

/**
 * Cómo describir las filas de una colección: sus columnas y las personas del
 * espacio de trabajo se leen una vez, y cada fila se describe con eso.
 *
 * Si el padre no es una colección, o su dueño no la puede ver, las filas no
 * tienen propiedades que decir.
 */
export const loadMcpRowDescriber = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collectionId: string | null,
): Promise<McpRowDescriber> => {
  if (collectionId === null) return describesNothing;
  const { principal, workspace } = call;
  const [schema, members] = await Promise.all([
    dependencies.schemas.getSchema(collectionId, workspace.id, principal.userId, principal.role),
    dependencies.people.listAssignableMembers(workspace.id),
  ]);
  if (schema.isFail()) return describesNothing;
  const columns = schema.getValue().properties;
  if (columns.length === 0) return describesNothing;
  const people = new Map(members.map((member) => [member.id, member.name]));
  return (values: PagePropertyValues | null, title: string) => describeMcpRowProperties(columns, values, title, people);
};
