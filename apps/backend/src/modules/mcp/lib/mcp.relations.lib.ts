import type { PagePropertyValue, PagePropertyValues, PageQueryRequest } from '@neuma/shared';
import { ACCESS_TOKEN_PERMISSIONS, Result, toValueList } from '@neuma/shared';
import { UUID_PATTERN } from '../../../common/constants/validation.constants';
import { MCP_RELATION_SEARCH_LIMIT } from '../constants/mcp.query.constants';
import { McpToolError } from '../infrastructure/errors/mcp.tool.error';
import type {
  McpColumnChanges,
  McpColumnDraft,
  McpNewColumn,
  McpOpenCollection,
  McpRelationCandidate,
  McpRelationChange,
  McpRelationRequest,
  McpRelationTarget,
  McpWrittenRow,
} from '../types/mcp.collections.types';
import type { McpCall, McpServerDependencies } from '../types/mcp.types';
import { canMcpActOnRow, openMcpCollection } from './mcp.collections.lib';
import { foldMcpName, sayMcpRefusalWithNames } from './mcp.columns.lib';
import { requireMcpSuccess } from './mcp.page-access.lib';

const readableRowOf = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  rowId: string,
): Promise<McpRelationCandidate | null> => {
  const { principal, workspace } = call;
  if (!canMcpActOnRow(call, collection, rowId, ACCESS_TOKEN_PERMISSIONS.collectionsRead)) return null;
  const page = await dependencies.pagesService.getAccessible(rowId, workspace.id, principal.userId, principal.role);
  if (page.isFail() || page.getValue().parentId !== collection.id) return null;
  return { id: rowId, title: page.getValue().title };
};

const askRowsOf = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  narrowing: Pick<PageQueryRequest, 'quickFilter' | 'search'>,
): Promise<readonly McpRelationCandidate[]> => {
  const { principal, workspace } = call;
  const found = requireMcpSuccess(
    await dependencies.collections.queryCollection({
      excludedRowIds: call.principal.access.pages
        .map((grant) => grant.pageId)
        .filter((pageId) => !canMcpActOnRow(call, collection, pageId, ACCESS_TOKEN_PERMISSIONS.collectionsRead)),
      pageId: collection.id,
      request: { ...narrowing, reducers: [{ id: 'rows', kind: 'results', limit: MCP_RELATION_SEARCH_LIMIT }] },
      role: principal.role,
      userId: principal.userId,
      workspaceId: workspace.id,
    }),
  );
  const outcome = found.reducers.rows;
  const ids = outcome?.kind === 'results' ? outcome.ids : [];
  return ids.flatMap((id) => {
    const row = found.rows[id];
    return row === undefined ? [] : [{ id, title: row.title }];
  });
};

/** The rows named exactly come first, so a common word cannot push the one that was meant out of the answer. */
const searchRowsTitled = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  collection: McpOpenCollection,
  words: string,
): Promise<readonly McpRelationCandidate[]> => {
  const titleKey = collection.shape.properties.find((column) => column.type === 'TITLE')?.key;
  const exact =
    titleKey === undefined
      ? []
      : await askRowsOf(dependencies, call, collection, {
          quickFilter: { kind: 'CONDITION', operator: 'IS', propertyKey: titleKey, value: words },
        });
  const similar = await askRowsOf(dependencies, call, collection, { search: words });
  return [...exact, ...similar];
};

/**
 * The rows a relation may link among the ones the request names, and only those the token may read. A collection
 * can hold thousands of rows, so each named row is looked up by its id or searched by its title, and the rows the
 * cell already links are checked so a replacement never unlinks one the agent could not see.
 */
export const loadMcpRelationTarget = async (
  dependencies: McpServerDependencies,
  call: McpCall,
  column: McpColumnDraft,
  references: readonly string[],
  currentLinks: readonly string[],
): Promise<McpRelationTarget> => {
  const { targetCollectionId } = column.config;
  if (targetCollectionId === null) throw new McpToolError(`${column.label} does not point to any collection yet.`);
  const collection = await openMcpCollection(
    dependencies,
    call,
    targetCollectionId,
    ACCESS_TOKEN_PERMISSIONS.collectionsRead,
  );
  const wanted = [...new Set(references.map((reference) => reference.trim()))];
  const byId = wanted.filter((reference) => UUID_PATTERN.test(reference));
  const byTitle = wanted.filter((reference) => !UUID_PATTERN.test(reference));
  const looked = await Promise.all(
    [...new Set([...byId, ...currentLinks])].map((rowId) => readableRowOf(dependencies, call, collection, rowId)),
  );
  const searched = await Promise.all(byTitle.map((words) => searchRowsTitled(dependencies, call, collection, words)));
  const rows = new Map<string, McpRelationCandidate>();
  for (const row of [...looked.flatMap((found) => found ?? []), ...searched.flat()]) rows.set(row.id, row);
  return { listNames: collection.listNames, rows: [...rows.values()], title: collection.title };
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
    const target = await loadMcpRelationTarget(
      dependencies,
      call,
      request.column,
      [...request.add, ...request.remove, ...(request.set ?? [])],
      readCurrentLinks(request.column, current),
    );
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
