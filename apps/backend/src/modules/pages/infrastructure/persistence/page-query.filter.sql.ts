import type { PageFilter, PageFilterCondition, PagePropertyValue } from '@neuma/shared';
import {
  getPagePropertyLogicalType,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_OPERATOR,
  PAGE_PROPERTY_LOGICAL_TYPE,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { DAY_ONLY, MILLISECONDS_IN_A_DAY, SQL_FALSE, SQL_TRUE } from '../../constants/page-query.sql.constants';
import type {
  CellContext,
  DaySpan,
  Predicate,
  PredicateInput,
  PredicateTable,
  SqlFragment,
} from '../../types/page-query.sql.types';
import { cellOf, dateEndOf, dateStartOf, isEmptyCell, numberOf, textOf } from './page-query.cell.sql';
import { allOf, anyOf, frag, negate, sqlParameter, sqlText, sqlTextList } from './page-query.sql.lib';

/** The text a value compares as, which is what the shared engine's `toComparableText` reads. */
const comparableText = (value: PagePropertyValue): string => {
  if (typeof value === 'string') return value;
  return typeof value === 'object' ? '' : String(value);
};

/** A day argument covers its whole day, so an instant of creation matches the day it fell on. */
const readArgumentSpan = (argument: PagePropertyValue): DaySpan | null => {
  const text = comparableText(argument);
  const start = Date.parse(text);
  if (Number.isNaN(start)) return null;
  return { end: DAY_ONLY.test(text) ? start + MILLISECONDS_IN_A_DAY - 1 : start, start };
};

const instantParameter = (milliseconds: number): SqlFragment =>
  frag`to_timestamp(${sqlParameter(milliseconds, 'float8')} / 1000.0)`;

const equalsText = ({ argument, cell }: PredicateInput): SqlFragment =>
  frag`(${textOf(cell)} = ${sqlParameter(comparableText(argument), 'text')})`;

const containsText = ({ argument, cell }: PredicateInput): SqlFragment =>
  frag`(position(lower(${sqlParameter(comparableText(argument), 'text')}) in lower(${textOf(cell)})) > 0)`;

const containsEntry = ({ argument, cell }: PredicateInput): SqlFragment =>
  frag`(${cell} @> jsonb_build_array(${sqlParameter(comparableText(argument), 'text')}))`;

const readGroupOptionIds = ({ argument, property }: PredicateInput): readonly string[] =>
  (property.options ?? []).filter((option) => option.group === comparableText(argument)).map((option) => option.id);

const isInGroup = (input: PredicateInput): SqlFragment => {
  const ids = readGroupOptionIds(input);
  return ids.length === 0 ? SQL_FALSE : frag`(${textOf(input.cell)} = ANY(${sqlTextList(ids)}))`;
};

const textPredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: equalsText,
  [PAGE_FILTER_OPERATOR.IS_NOT]: (input) => negate(equalsText(input)),
  [PAGE_FILTER_OPERATOR.CONTAINS]: containsText,
  [PAGE_FILTER_OPERATOR.NOT_CONTAINS]: (input) => negate(containsText(input)),
};

const tagPredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: equalsText,
  [PAGE_FILTER_OPERATOR.IS_NOT]: (input) => negate(equalsText(input)),
};

const listPredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.CONTAINS]: containsEntry,
  [PAGE_FILTER_OPERATOR.NOT_CONTAINS]: (input) => negate(containsEntry(input)),
};

const statusPredicates: PredicateTable = {
  ...tagPredicates,
  [PAGE_FILTER_OPERATOR.IS_IN_GROUP]: isInGroup,
  [PAGE_FILTER_OPERATOR.IS_NOT_IN_GROUP]: (input) => negate(isInGroup(input)),
};

/** A comparison against something that is not a number never matches, as the shared engine does. */
const compareNumber =
  (comparison: '<' | '=' | '<>' | '>'): Predicate =>
  ({ argument, cell }) =>
    typeof argument === 'number'
      ? frag`COALESCE(${numberOf(cell)} ${sqlText(comparison)} ${sqlParameter(argument, 'numeric')}, FALSE)`
      : SQL_FALSE;

const numberPredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: compareNumber('='),
  [PAGE_FILTER_OPERATOR.IS_NOT]: compareNumber('<>'),
  [PAGE_FILTER_OPERATOR.IS_GREATER_THAN]: compareNumber('>'),
  [PAGE_FILTER_OPERATOR.IS_LESS_THAN]: compareNumber('<'),
};

const booleanPredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: ({ argument, cell }) =>
    typeof argument === 'boolean' ? frag`(${cell} = to_jsonb(${sqlParameter(argument, 'boolean')}))` : SQL_FALSE,
};

const spanOverlap = (cell: SqlFragment, span: DaySpan): SqlFragment =>
  frag`COALESCE(${dateStartOf(cell)} <= ${instantParameter(span.end)} AND ${instantParameter(span.start)} <= ${dateEndOf(cell)}, FALSE)`;

const dateCondition =
  (build: (cell: SqlFragment, span: DaySpan) => SqlFragment): Predicate =>
  ({ argument, cell }) => {
    const span = readArgumentSpan(argument);
    return span === null ? SQL_FALSE : build(cell, span);
  };

/** A range matches a day when the two overlap; before and after read the end and the start of the range. */
const datePredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: dateCondition(spanOverlap),
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: dateCondition(
    (cell, span) => frag`COALESCE(${dateEndOf(cell)} < ${instantParameter(span.start)}, FALSE)`,
  ),
  [PAGE_FILTER_OPERATOR.IS_AFTER]: dateCondition(
    (cell, span) => frag`COALESCE(${dateStartOf(cell)} > ${instantParameter(span.end)}, FALSE)`,
  ),
};

/** What a kind of property can be asked; the kinds that hold files, or that are not known, answer no question. */
const predicatesFor = (property: SchemaPropertyDefinition): PredicateTable => {
  switch (getPagePropertyLogicalType(property.type)) {
    case PAGE_PROPERTY_LOGICAL_TYPE.TEXT:
      return textPredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.NUMBER:
      return numberPredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN:
      return booleanPredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.DATE:
      return datePredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.TAG:
      return tagPredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG:
    case PAGE_PROPERTY_LOGICAL_TYPE.RELATION:
      return listPredicates;
    case PAGE_PROPERTY_LOGICAL_TYPE.STATUS:
      return statusPredicates;
    default:
      return {};
  }
};

const conditionSql = (
  condition: PageFilterCondition,
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  context: CellContext,
): SqlFragment => {
  const property = properties.get(condition.propertyKey);
  if (property === undefined) return SQL_TRUE;
  const cell = cellOf(property, context);
  if (condition.operator === PAGE_FILTER_OPERATOR.IS_EMPTY) return isEmptyCell(property, cell);
  if (condition.operator === PAGE_FILTER_OPERATOR.IS_NOT_EMPTY) return negate(isEmptyCell(property, cell));
  if (condition.value === null) return SQL_TRUE;
  const predicate = predicatesFor(property)[condition.operator];
  if (predicate === undefined) return SQL_TRUE;
  const compared = predicate({ argument: condition.value, cell, operator: condition.operator, property });
  // A row with no value for the property is not held back by a condition on it, as in the shared engine.
  return compared === null ? SQL_TRUE : anyOf([frag`(${cell} IS NULL)`, compared]);
};

/** The filter as a condition on the rows, with the same meaning as `matchesPageFilter` in the shared engine. */
export const filterSql = (
  filter: PageFilter,
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  context: CellContext,
): SqlFragment => {
  if (filter.kind === 'CONDITION') return conditionSql(filter, properties, context);
  if (filter.conditions.length === 0) return SQL_TRUE;
  const parts = filter.conditions.map((child) => filterSql(child, properties, context));
  return filter.operator === PAGE_FILTER_GROUP_OPERATOR.AND ? allOf(parts) : anyOf(parts);
};
