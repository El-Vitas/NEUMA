import type { PagePropertyValue, PagePropertyValues } from '@neuma/shared';
import { ACCESS_TOKEN_PERMISSIONS, Result, toValueList } from '@neuma/shared';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpColumnChanges,
  McpColumnDraft,
  McpNewColumn,
  McpRelationChange,
  McpRelationRequest,
  McpRelationTarget,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies } from '../types/mcp.types';
import { canMcpActOnRow, openMcpCollection } from './mcp.collections.lib';
import { foldMcpName, sayMcpRefusalWithNames } from './mcp.columns.lib';
import { requireMcpSuccess } from './mcp.page-access.lib';

/** The rows a relation may link: those of its collection that the token may read, and only those. */
export const loadMcpRelationTarget = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  column: McpColumnDraft,
): Promise<McpRelationTarget> => {
  const { targetCollectionId } = column.config;
  if (targetCollectionId === null) throw new McpToolError(`${column.label} does not point to any collection yet.`);
  const { principal, workspace } = call;
  const collection = await openMcpCollection(
    dependencies,
    call,
    targetCollectionId,
    ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  );
  const found = requireMcpSuccess(
    await dependencies.collections.queryRows({
      configuration: null,
      pageId: collection.id,
      role: principal.role,
      userId: principal.userId,
      viewName: null,
      workspaceId: workspace.id,
    }),
  );
  const rows = found.rows
    .filter((row) => canMcpActOnRow(call, collection, row.id, ACCESS_TOKEN_PERMISSIONS.collectionsRead))
    .map(({ id, title }) => ({ id, title }));
  return { listNames: collection.listNames, rows, title: collection.title };
};

/** A row is named by its page id or by its title; a title two rows share must be told apart by id. */
const findMcpRelationRow = (
  column: McpColumnDraft,
  target: McpRelationTarget,
  reference: string,
): Result<string, string> => {
  const byId = target.rows.find((row) => row.id === reference);
  if (byId !== undefined) return Result.ok(byId.id);
  const named = target.rows.filter((row) => foldMcpName(row.title) === foldMcpName(reference));
  const [row, namesake] = named;
  if (row === undefined) {
    return Result.fail(
      sayMcpRefusalWithNames(
        `${column.label}: ${target.title} has no row "${reference}".`,
        'rows',
        target.rows.map((candidate) => candidate.title),
        target.listNames,
      ),
    );
  }
  if (namesake !== undefined) {
    return Result.fail(
      `${column.label}: more than one row of ${target.title} is called "${reference}". Name the row by its page id: ${named.map((candidate) => candidate.id).join(', ')}.`,
    );
  }
  return Result.ok(row.id);
};

const findEach = (
  column: McpColumnDraft,
  target: McpRelationTarget,
  references: readonly string[],
): Result<string[], string> => {
  const ids: string[] = [];
  for (const reference of references) {
    const found = findMcpRelationRow(column, target, reference);
    if (found.isFail()) return Result.fail(found.getError());
    ids.push(found.getValue());
  }
  return Result.ok([...new Set(ids)]);
};

const readCurrentLinks = (column: { readonly key: string }, current: PagePropertyValues | null): readonly string[] => {
  const stored = current?.[column.key];
  return stored === undefined ? [] : toValueList(stored);
};

/**
 * What to link and unlink to get the cell where the request wants it. A link the token cannot read is never
 * unlinked by a replacement, since the agent never saw it; links already there are not added again.
 */
export const planMcpRelationChanges = (
  request: McpRelationRequest,
  target: McpRelationTarget,
  current: PagePropertyValues | null,
): Result<McpRelationChange[], string> => {
  const links = readCurrentLinks(request.column, current);
  const visible = new Set(target.rows.map((row) => row.id));
  const wanted = request.set === null ? null : findEach(request.column, target, request.set);
  if (wanted?.isFail() === true) return Result.fail(wanted.getError());
  const added = findEach(request.column, target, request.add);
  if (added.isFail()) return Result.fail(added.getError());
  const removed = findEach(request.column, target, request.remove);
  if (removed.isFail()) return Result.fail(removed.getError());
  const toAdd = wanted === null ? added.getValue() : wanted.getValue();
  const toRemove =
    wanted === null
      ? removed.getValue()
      : links.filter((link) => visible.has(link) && !wanted.getValue().includes(link));
  const { key } = request.column;
  return Result.ok([
    ...toRemove
      .filter((id) => links.includes(id))
      .map((targetId): McpRelationChange => ({ kind: 'REMOVE', propertyKey: key, targetId })),
    ...toAdd
      .filter((id) => !links.includes(id))
      .map((targetId): McpRelationChange => ({ kind: 'ADD', propertyKey: key, targetId })),
  ]);
};

/** Resolves every relation of a request against the rows its collection offers, before anything is written. */
export const planMcpRowRelations = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  requests: readonly McpRelationRequest[],
  current: PagePropertyValues | null,
): Promise<McpRelationChange[]> => {
  const changes: McpRelationChange[] = [];
  for (const request of requests) {
    const target = await loadMcpRelationTarget(dependencies, call, request.column);
    const planned = planMcpRelationChanges(request, target, current);
    if (planned.isFail()) throw new McpToolError(planned.getError());
    changes.push(...planned.getValue());
  }
  return changes;
};

/** A relation column names its collection as a person would; it is stored by page id once the token may read it. */
export const resolveMcpNewRelationTargets = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  changes: McpColumnChanges,
): Promise<McpColumnChanges> => {
  if (!changes.addColumns?.some((column) => column.target !== undefined)) return changes;
  const resolved: McpNewColumn[] = [];
  for (const column of changes.addColumns) {
    if (column.target === undefined) {
      resolved.push(column);
      continue;
    }
    const target = await openMcpCollection(dependencies, call, column.target, ACCESS_TOKEN_PERMISSIONS.collectionsRead);
    resolved.push({ ...column, target: target.id });
  }
  return { ...changes, addColumns: resolved };
};

/** The row as it stands once the links were made, so the answer shows them without reading the row again. */
export const withLinkedRows = (row: McpWrittenRow, changes: readonly McpRelationChange[]): McpWrittenRow => {
  const linked = new Map<string, readonly string[]>();
  for (const key of new Set(changes.map((change) => change.propertyKey))) {
    const removed = changes.filter((change) => change.propertyKey === key && change.kind === 'REMOVE');
    const added = changes.filter((change) => change.propertyKey === key && change.kind === 'ADD');
    const kept = readCurrentLinks({ key }, row.propertyValues).filter(
      (id) => !removed.some((change) => change.targetId === id),
    );
    linked.set(key, [...kept, ...added.map((change) => change.targetId).filter((id) => !kept.includes(id))]);
  }
  const others = Object.entries(row.propertyValues ?? {}).filter(([key]) => !linked.has(key));
  const links = [...linked].filter(([, ids]) => ids.length > 0);
  return { ...row, propertyValues: Object.fromEntries<PagePropertyValue>([...others, ...links]) };
};

/** Linking is a write on the row, so it goes through the same transaction that keeps the other side in step. */
export const applyMcpRowRelations = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  row: { readonly id: string; readonly spaceId: string },
  changes: readonly McpRelationChange[],
): Promise<void> => {
  if (changes.length === 0) return;
  const { principal, workspace } = call;
  requireMcpSuccess(
    await dependencies.rows.changeRelations({
      changes,
      role: principal.role,
      rowId: row.id,
      spaceId: row.spaceId,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
};
