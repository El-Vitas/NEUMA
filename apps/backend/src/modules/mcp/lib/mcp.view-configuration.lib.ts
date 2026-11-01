import type { JsonObject } from '@neuma/db';
import type { PagePropertyType } from '@neuma/shared';
import { PAGE_FILTER_GROUP_OPERATOR, Result } from '@neuma/shared';
import { MCP_TYPED_VIEW_REFERENCES } from '../constants/mcp.views.constants';
import type { McpColumnsInHand, McpViewShapeInput } from '../types/mcp.collections.types';
import type { McpAssignablePerson } from '../types/mcp.types';
import { readMcpConditionValue, requireMcpColumn } from './mcp.columns.lib';

const requireKeys = (known: McpColumnsInHand, references: readonly string[]): Result<string[], string> => {
  const keys: string[] = [];
  for (const reference of references) {
    const column = requireMcpColumn(known.columns, reference, known.listNames);
    if (column.isFail()) return Result.fail(column.getError());
    keys.push(column.getValue().key);
  }
  return Result.ok(keys);
};

const buildFilter = (
  known: McpColumnsInHand,
  where: NonNullable<McpViewShapeInput['where']>,
  people: readonly McpAssignablePerson[],
): Result<JsonObject | null, string> => {
  if (where.length === 0) return Result.ok(null);
  const conditions: JsonObject[] = [];
  for (const condition of where) {
    const column = requireMcpColumn(known.columns, condition.column, known.listNames);
    if (column.isFail()) return Result.fail(column.getError());
    const value = readMcpConditionValue(column.getValue(), condition, people, known.listNames);
    if (value.isFail()) return Result.fail(value.getError());
    conditions.push({
      kind: 'CONDITION',
      operator: condition.operator,
      propertyKey: column.getValue().key,
      value: value.getValue(),
    });
  }
  return Result.ok({ conditions, kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND });
};

const buildSorts = (
  known: McpColumnsInHand,
  sort: NonNullable<McpViewShapeInput['sort']>,
): Result<JsonObject[], string> => {
  const keys = requireKeys(
    known,
    sort.map((rule) => rule.column),
  );
  if (keys.isFail()) return Result.fail(keys.getError());
  return Result.ok(sort.map((rule, at) => ({ direction: rule.direction, propertyKey: keys.getValue()[at] ?? '' })));
};

const buildGroupBy = (known: McpColumnsInHand, groupBy: string | null): Result<string | null, string> => {
  if (groupBy === null) return Result.ok(null);
  const column = requireMcpColumn(known.columns, groupBy, known.listNames);
  return column.isFail() ? Result.fail(column.getError()) : Result.ok(column.getValue().key);
};

/** A column of one kind, or null to take it off the view. */
const buildTypedKey = (
  known: McpColumnsInHand,
  reference: string | null,
  expected: PagePropertyType,
): Result<string | null, string> => {
  if (reference === null) return Result.ok(null);
  const column = requireMcpColumn(known.columns, reference, known.listNames);
  if (column.isFail()) return Result.fail(column.getError());
  if (column.getValue().type === expected) return Result.ok(column.getValue().key);
  return Result.fail(`"${reference}" is not a ${expected.toLowerCase()} column, so the view cannot use it for that.`);
};

/** The columns a calendar, a timeline, a gallery or a board point at, each of the kind it needs. */
const buildTypedReferences = (known: McpColumnsInHand, shape: McpViewShapeInput): Result<JsonObject, string> => {
  const settings: Record<string, string | null> = {};
  for (const reference of MCP_TYPED_VIEW_REFERENCES) {
    const asked = shape[reference.input];
    if (asked === undefined) continue;
    const key = buildTypedKey(known, asked, reference.type);
    if (key.isFail()) return Result.fail(key.getError());
    settings[reference.configurationKey] = key.getValue();
  }
  return Result.ok(settings);
};

/** What a view keeps that needs no column: how big its cards are and how much time one screen holds. */
const buildPlainSettings = (shape: McpViewShapeInput): JsonObject => ({
  ...(shape.cardSize === undefined ? {} : { cardSize: shape.cardSize }),
  ...(shape.scale === undefined ? {} : { dateScale: shape.scale }),
});

/** Unrequested settings stay as they were. */
export const buildMcpViewConfiguration = (
  known: McpColumnsInHand,
  shape: McpViewShapeInput,
  people: readonly McpAssignablePerson[],
  base: JsonObject,
): Result<JsonObject, string> => {
  const filter = shape.where === undefined ? null : buildFilter(known, shape.where, people);
  const sorts = shape.sort === undefined ? null : buildSorts(known, shape.sort);
  const groupBy = shape.groupBy === undefined ? null : buildGroupBy(known, shape.groupBy);
  const subGroupBy = shape.subGroupBy === undefined ? null : buildGroupBy(known, shape.subGroupBy);
  const visible = shape.visibleColumns === undefined ? null : requireKeys(known, shape.visibleColumns);
  const references = buildTypedReferences(known, shape);
  const failed = [filter, sorts, groupBy, subGroupBy, visible, references].find((part) => part?.isFail() === true);
  if (failed !== undefined && failed !== null) return Result.fail(failed.getError());
  return Result.ok({
    ...base,
    ...(filter === null ? {} : { filter: filter.getValue() }),
    ...(sorts === null ? {} : { sorts: sorts.getValue() }),
    ...(groupBy === null ? {} : { groupBy: groupBy.getValue() }),
    ...(subGroupBy === null ? {} : { subGroupBy: subGroupBy.getValue() }),
    ...(visible === null ? {} : { visibleProperties: visible.getValue() }),
    ...(references.isOk() ? references.getValue() : {}),
    ...buildPlainSettings(shape),
  });
};
