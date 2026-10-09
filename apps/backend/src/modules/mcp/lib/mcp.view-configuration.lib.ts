import type { Prisma } from '@company-brain/db/generated';
import { PAGE_FILTER_GROUP_OPERATOR, Result } from '@company-brain/shared';
import type { McpColumnsInHand, McpViewShapeInput } from '../types/mcp.collections.types';
import type { McpPerson } from '../types/mcp.types';
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
  people: readonly McpPerson[],
): Result<Prisma.InputJsonObject | null, string> => {
  if (where.length === 0) return Result.ok(null);
  const conditions: Prisma.InputJsonObject[] = [];
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
): Result<Prisma.InputJsonObject[], string> => {
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

/** Unrequested settings stay as they were. */
export const buildMcpViewConfiguration = (
  known: McpColumnsInHand,
  shape: McpViewShapeInput,
  people: readonly McpPerson[],
  base: Prisma.InputJsonObject,
): Result<Prisma.InputJsonObject, string> => {
  const filter = shape.where === undefined ? null : buildFilter(known, shape.where, people);
  const sorts = shape.sort === undefined ? null : buildSorts(known, shape.sort);
  const groupBy = shape.groupBy === undefined ? null : buildGroupBy(known, shape.groupBy);
  const visible = shape.visibleColumns === undefined ? null : requireKeys(known, shape.visibleColumns);
  const failed = [filter, sorts, groupBy, visible].find((part) => part?.isFail() === true);
  if (failed !== undefined && failed !== null) return Result.fail(failed.getError());
  return Result.ok({
    ...base,
    ...(filter === null ? {} : { filter: filter.getValue() }),
    ...(sorts === null ? {} : { sorts: sorts.getValue() }),
    ...(groupBy === null ? {} : { groupBy: groupBy.getValue() }),
    ...(visible === null ? {} : { visibleProperties: visible.getValue() }),
  });
};
