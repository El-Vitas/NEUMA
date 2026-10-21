import type { JsonObject } from '@neuma/db';
import { DatabasePropertyType } from '@neuma/db';
import type {
  PageQueryAggregateValue,
  PageQueryAggregationItem,
  PageQueryAggregationsOutcome,
  PageQueryGroupsOutcome,
  PageQueryReducer,
  PageQueryRequest,
  PageQueryResultsOutcome,
} from '@neuma/shared';
import { PAGE_QUERY_LIMITS, Result, readPageViewConfiguration, UNASSIGNED_GROUP_KEY } from '@neuma/shared';
import { MCP_QUERY_ROWS_PER_GROUP_MAX } from '../constants/mcp.limits.constants';
import {
  MCP_COUNTS_REDUCER_ID,
  MCP_NO_VALUE_GROUP_NAME,
  MCP_ROWS_REDUCER_ID,
  MCP_TOTAL_ITEM_ID,
} from '../constants/mcp.query.constants';
import type {
  McpColumn,
  McpColumnDraft,
  McpOpenCollection,
  McpQueryAnswer,
  McpQueryCollectionInput,
  McpQueryCollectionOutput,
} from '../types/mcp.collections.types';
import type {
  McpAggregateValues,
  McpOutputGroup,
  McpPlannedAggregate,
  McpPlannedAggregates,
  McpQueryDescriber,
  McpQueryPlan,
} from '../types/mcp.query.types';
import type { McpAssignablePerson } from '../types/mcp.types';
import { describeMcpRow, readMcpColumnsInHand, requireMcpView } from './mcp.collections.lib';
import { findMcpOption, pickPerson, requireMcpColumn } from './mcp.columns.lib';
import { requireMcpInput } from './mcp.page-access.lib';
import { buildMcpViewConfiguration } from './mcp.view-configuration.lib';

/** Without a name, a group is the way rows read when no value is set. */
const toGroupKey = (
  column: McpColumnDraft,
  name: string,
  people: readonly McpAssignablePerson[],
  collection: McpOpenCollection,
): Result<string, string> => {
  if (name === MCP_NO_VALUE_GROUP_NAME) return Result.ok(UNASSIGNED_GROUP_KEY);
  switch (column.type) {
    case DatabasePropertyType.SELECT:
    case DatabasePropertyType.STATUS:
    case DatabasePropertyType.MULTI_SELECT: {
      const option = findMcpOption(column, name, collection.listNames);
      return option.isFail() ? Result.fail(option.getError()) : Result.ok(option.getValue().id ?? name);
    }
    case DatabasePropertyType.PERSON:
      return pickPerson(column, name, people);
    default:
      return Result.ok(name);
  }
};

const describeGroupName = (
  column: McpColumnDraft | null,
  key: string,
  people: readonly McpAssignablePerson[],
): string => {
  if (key === UNASSIGNED_GROUP_KEY) return MCP_NO_VALUE_GROUP_NAME;
  if (column?.type === DatabasePropertyType.PERSON) return people.find((person) => person.id === key)?.name ?? key;
  return column?.options?.find((option) => option.id === key)?.value ?? key;
};

const buildConfiguration = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
  people: readonly McpAssignablePerson[],
): JsonObject => {
  const base = input.view === undefined ? {} : requireMcpView(collection, input.view).configuration;
  const shape = {
    ...(input.sort === undefined ? {} : { sort: input.sort }),
    ...(input.where === undefined ? {} : { where: input.where }),
  };
  return requireMcpInput(buildMcpViewConfiguration(readMcpColumnsInHand(collection), shape, people, base));
};

/** Counting rows is always asked, since the total is part of every answer. */
const planAggregates = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
): Result<McpPlannedAggregates, string> => {
  const items: PageQueryAggregationItem[] = [{ calculation: 'COUNT_ALL', id: MCP_TOTAL_ITEM_ID, propertyKey: null }];
  const planned: McpPlannedAggregate[] = [];
  for (const [position, wanted] of (input.aggregate ?? []).entries()) {
    const id = `a${String(position)}`;
    if (wanted.column === undefined) {
      if (wanted.calculation !== 'COUNT_ALL') {
        return Result.fail(`${wanted.calculation} works on a column: name it with "column".`);
      }
      items.push({ calculation: wanted.calculation, id, propertyKey: null });
      planned.push({ id, label: wanted.calculation });
      continue;
    }
    const column = requireMcpColumn(collection.shape.properties, wanted.column, collection.listNames);
    if (column.isFail()) return Result.fail(column.getError());
    items.push({ calculation: wanted.calculation, id, propertyKey: column.getValue().key });
    planned.push({ id, label: `${wanted.calculation} ${column.getValue().label}` });
  }
  return Result.ok({ items, planned });
};

const resolveGroupColumn = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
  viewGroupBy: string | null,
): Result<McpColumnDraft | null, string> => {
  const reference = input.groupBy ?? (input.group === undefined ? undefined : (viewGroupBy ?? undefined));
  if (reference === undefined) {
    return input.group === undefined
      ? Result.ok(null)
      : Result.fail('group needs a grouping: name a column with groupBy.');
  }
  return requireMcpColumn(collection.shape.properties, reference, collection.listNames);
};

const buildRowsReducer = (
  input: McpQueryCollectionInput,
  groupColumn: McpColumnDraft | null,
  groupKey: string | null,
): PageQueryReducer | null => {
  if (input.limit === 0) return null;
  if (groupColumn === null) {
    return {
      cursor: input.cursor,
      id: MCP_ROWS_REDUCER_ID,
      kind: 'results',
      limit: Math.min(input.limit, PAGE_QUERY_LIMITS.maximumResultsLimit),
    };
  }
  const limit = Math.min(input.limit, MCP_QUERY_ROWS_PER_GROUP_MAX);
  if (groupKey === null) {
    return { groupBy: groupColumn.key, id: MCP_ROWS_REDUCER_ID, kind: 'groups', rowsPerGroup: limit };
  }
  return {
    cursor: input.cursor,
    group: { key: groupKey },
    groupBy: groupColumn.key,
    id: MCP_ROWS_REDUCER_ID,
    kind: 'groupResults',
    limit,
  };
};

/** The view's own order and manual placement are kept unless the agent replaced its filter or order. */
const buildScope = (
  collection: McpOpenCollection,
  input: McpQueryCollectionInput,
  configuration: ReturnType<typeof readPageViewConfiguration>,
): Pick<PageQueryRequest, 'quickFilter' | 'sorts' | 'viewId'> => {
  const view = input.view === undefined ? null : requireMcpView(collection, input.view);
  if (view?.id !== undefined && input.where === undefined && input.sort === undefined) return { viewId: view.id };
  return {
    ...(configuration.filter === null ? {} : { quickFilter: configuration.filter }),
    ...(configuration.sorts.length === 0 ? {} : { sorts: configuration.sorts }),
  };
};

/** One request for everything the agent asked: rows, group counts and totals, each only if wanted. */
export const planMcpQuery = (
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  input: McpQueryCollectionInput,
): Result<McpQueryPlan, string> => {
  const configuration = readPageViewConfiguration(buildConfiguration(collection, input, people));
  const groupColumn = resolveGroupColumn(collection, input, configuration.groupBy);
  if (groupColumn.isFail()) return Result.fail(groupColumn.getError());
  const column = groupColumn.getValue();
  const groupKey =
    column === null || input.group === undefined
      ? Result.ok<string | null>(null)
      : toGroupKey(column, input.group, people, collection);
  if (groupKey.isFail()) return Result.fail(groupKey.getError());
  const aggregates = planAggregates(collection, input);
  if (aggregates.isFail()) return Result.fail(aggregates.getError());
  const rows = buildRowsReducer(input, column, groupKey.getValue());
  const counts: PageQueryReducer = {
    by: column === null ? 'NONE' : 'GROUP',
    ...(column === null ? {} : { groupBy: column.key }),
    id: MCP_COUNTS_REDUCER_ID,
    items: aggregates.getValue().items,
    kind: 'aggregations',
  };
  return Result.ok({
    aggregates: aggregates.getValue().planned,
    groupColumn: column,
    groupKey: groupKey.getValue(),
    request: {
      ...buildScope(collection, input, configuration),
      reducers: rows === null ? [counts] : [rows, counts],
      ...(input.search === undefined || input.search === '' ? {} : { search: input.search }),
      ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
    },
  });
};

export const pickMcpQueryColumns = (
  collection: McpOpenCollection,
  input: { readonly columns?: readonly string[] | undefined },
): Result<readonly McpColumn[], string> => {
  if (input.columns === undefined) return Result.ok(collection.shape.properties);
  const chosen: McpColumn[] = [];
  for (const reference of input.columns) {
    const column = requireMcpColumn(collection.shape.properties, reference, collection.listNames);
    if (column.isFail()) return Result.fail(column.getError());
    const { key } = column.getValue();
    const shown = collection.shape.properties.find((candidate) => candidate.key === key);
    if (shown !== undefined) chosen.push(shown);
  }
  return Result.ok(chosen);
};

const readAggregates = (
  plan: McpQueryPlan,
  values: McpAggregateValues,
): Record<string, PageQueryAggregateValue> | null =>
  plan.aggregates.length === 0
    ? null
    : Object.fromEntries(plan.aggregates.map((aggregate) => [aggregate.label, values[aggregate.id] ?? null]));

const readCount = (values: McpAggregateValues): number => Number(values[MCP_TOTAL_ITEM_ID] ?? 0);

const readCounts = (answer: McpQueryAnswer): PageQueryAggregationsOutcome | null => {
  const outcome = answer.reducers[MCP_COUNTS_REDUCER_ID];
  return outcome?.kind === 'aggregations' ? outcome : null;
};

const readResults = (answer: McpQueryAnswer): PageQueryResultsOutcome | null => {
  const outcome = answer.reducers[MCP_ROWS_REDUCER_ID];
  return outcome?.kind === 'results' ? outcome : null;
};

const readGroups = (answer: McpQueryAnswer): PageQueryGroupsOutcome | null => {
  const outcome = answer.reducers[MCP_ROWS_REDUCER_ID];
  return outcome?.kind === 'groups' ? outcome : null;
};

const buildDescriber = (
  portalUrl: string,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  plan: McpQueryPlan,
  answer: McpQueryAnswer,
  columns: readonly McpColumn[],
): McpQueryDescriber => {
  const lookups = {
    files: new Map(answer.attachedFiles.map((file) => [file.id, file.name])),
    rows: new Map<string, string>(),
  };
  const shape = { properties: columns, views: collection.shape.views };
  return {
    people,
    plan,
    rowsOf: (ids) =>
      ids.flatMap((id) => {
        const row = answer.rows[id];
        return row === undefined ? [] : [describeMcpRow(portalUrl, shape, row, people, lookups)];
      }),
  };
};

const describeGroup = (
  describer: McpQueryDescriber,
  entry: { readonly ids: readonly string[]; readonly key: string; readonly nextCursor: string | null },
  values: McpAggregateValues,
): McpOutputGroup => {
  const aggregates = readAggregates(describer.plan, values);
  return {
    ...(aggregates === null ? {} : { aggregates }),
    count: readCount(values),
    name: describeGroupName(describer.plan.groupColumn, entry.key, describer.people),
    ...(entry.nextCursor === null ? {} : { nextCursor: entry.nextCursor }),
    rows: describer.rowsOf(entry.ids),
  };
};

const describeGroups = (
  describer: McpQueryDescriber,
  counts: PageQueryAggregationsOutcome,
  answer: McpQueryAnswer,
): Pick<McpQueryCollectionOutput, 'groups' | 'hasMoreGroups'> => {
  const valuesByKey = new Map(counts.groups.map((group) => [group.key, group.values]));
  const single = readResults(answer);
  const { groupKey } = describer.plan;
  if (groupKey !== null) {
    const entry = { ids: single?.ids ?? [], key: groupKey, nextCursor: single?.nextCursor ?? null };
    return { groups: [describeGroup(describer, entry, valuesByKey.get(groupKey) ?? {})] };
  }
  const listed = readGroups(answer);
  const entries =
    listed === null
      ? counts.groups.map((group) => ({ ids: [], key: group.key, nextCursor: null }))
      : listed.groups.filter((group) => !group.isHidden);
  return {
    groups: entries.map((entry) => describeGroup(describer, entry, valuesByKey.get(entry.key) ?? {})),
    ...(listed?.hasMoreGroups === true ? { hasMoreGroups: true } : {}),
  };
};

/** The answer as the agent reads it: names instead of ids, only the columns it asked for. */
export const describeMcpQueryAnswer = (
  portalUrl: string,
  collection: McpOpenCollection,
  people: readonly McpAssignablePerson[],
  plan: McpQueryPlan,
  answer: McpQueryAnswer,
  columns: readonly McpColumn[],
): McpQueryCollectionOutput => {
  const counts = readCounts(answer);
  const describer = buildDescriber(portalUrl, collection, people, plan, answer, columns);
  const totals = counts?.totals ?? {};
  const aggregates = readAggregates(plan, totals);
  const base = {
    ...(aggregates === null ? {} : { aggregates }),
    changesCursor: answer.changesCursor,
    total: counts?.distinctRowCount ?? readCount(totals),
  };
  if (counts !== null && plan.groupColumn !== null) {
    return { ...base, ...describeGroups(describer, counts, answer), rows: [] };
  }
  const results = readResults(answer);
  return {
    ...base,
    ...(results === null || results.nextCursor === null ? {} : { nextCursor: results.nextCursor }),
    rows: describer.rowsOf(results?.ids ?? []),
  };
};
