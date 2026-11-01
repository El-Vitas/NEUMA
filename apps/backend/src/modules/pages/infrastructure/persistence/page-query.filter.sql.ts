import type {
  PageDateArgument,
  PageFilter,
  PageFilterCondition,
  PageFilterOperator,
  PagePropertyValue,
} from '@neuma/shared';
import {
  getPagePropertyLogicalType,
  matchesMissingPageValue,
  PAGE_FILTER_GROUP_OPERATOR,
  PAGE_FILTER_OPERATOR,
  PAGE_PROPERTY_LOGICAL_TYPE,
  readPageDateArgument,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { SQL_FALSE, SQL_TRUE } from '../../constants/page-query.sql.constants';
import type {
  CellContext,
  Predicate,
  PredicateInput,
  PredicateTable,
  RangeEnds,
  SqlFragment,
} from '../../types/page-query.sql.types';
import {
  cellOf,
  dateEndOf,
  dateStartOf,
  dayEndOf,
  dayStartOf,
  isDateCell,
  isDayCell,
  isEmptyCell,
  numberOf,
  textOf,
} from './page-query.cell.sql';
import { allOf, anyOf, frag, negate, sqlParameter, sqlText, sqlTextList } from './page-query.sql.lib';

/** The text a value compares as, which is what the shared engine's `toComparableText` reads. */
const comparableText = (value: PagePropertyValue): string => {
  if (typeof value === 'string') return value;
  return typeof value === 'object' ? '' : String(value);
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

/** Same meaning as `matchesPageDateOperator` in the shared engine, written once for days and once for instants. */
const compareRanges = (operator: PageFilterOperator, ends: RangeEnds): SqlFragment => {
  const { argumentEnd, argumentStart, valueEnd, valueStart } = ends;
  switch (operator) {
    case PAGE_FILTER_OPERATOR.IS_BEFORE:
      return frag`(${valueEnd} < ${argumentStart})`;
    case PAGE_FILTER_OPERATOR.IS_AFTER:
      return frag`(${valueStart} > ${argumentEnd})`;
    case PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE:
      return frag`(${valueEnd} <= ${argumentEnd})`;
    case PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER:
      return frag`(${valueStart} >= ${argumentStart})`;
    default:
      return frag`(${valueStart} <= ${argumentEnd} AND ${argumentStart} <= ${valueEnd})`;
  }
};

const dayParameter = (day: string): SqlFragment => frag`(${sqlParameter(day, 'text')})::date`;

/** A date without a time is compared by days and one with a time by instants, as the shared engine does. */
const compareDate = (operator: PageFilterOperator, cell: SqlFragment, argument: PageDateArgument): SqlFragment =>
  frag`COALESCE(CASE WHEN ${isDateCell(cell)} THEN CASE WHEN ${isDayCell(cell)} THEN ${compareRanges(operator, {
    argumentEnd: dayParameter(argument.endDay),
    argumentStart: dayParameter(argument.startDay),
    valueEnd: dayEndOf(cell),
    valueStart: dayStartOf(cell),
  })} ELSE ${compareRanges(operator, {
    argumentEnd: instantParameter(argument.endTime),
    argumentStart: instantParameter(argument.startTime),
    valueEnd: dateEndOf(cell),
    valueStart: dateStartOf(cell),
  })} END END, FALSE)`;

const dateCondition =
  (operator: PageFilterOperator): Predicate =>
  ({ argument, cell, timeZone }) => {
    const dateArgument = readPageDateArgument(argument, timeZone);
    return dateArgument === null ? SQL_FALSE : compareDate(operator, cell, dateArgument);
  };

/** A range matches a day when the two overlap; before and after read the end and the start of the range. */
const datePredicates: PredicateTable = {
  [PAGE_FILTER_OPERATOR.IS]: dateCondition(PAGE_FILTER_OPERATOR.IS),
  [PAGE_FILTER_OPERATOR.IS_BEFORE]: dateCondition(PAGE_FILTER_OPERATOR.IS_BEFORE),
  [PAGE_FILTER_OPERATOR.IS_AFTER]: dateCondition(PAGE_FILTER_OPERATOR.IS_AFTER),
  [PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE]: dateCondition(PAGE_FILTER_OPERATOR.IS_ON_OR_BEFORE),
  [PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER]: dateCondition(PAGE_FILTER_OPERATOR.IS_ON_OR_AFTER),
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
  const compared = predicate({
    argument: condition.value,
    cell,
    operator: condition.operator,
    property,
    timeZone: context.timeZone,
  });
  if (compared === null) return SQL_TRUE;
  const logicalType = getPagePropertyLogicalType(property.type);
  // A row with no value is answered by `matchesMissingPageValue`, the same rule the shared engine applies.
  return matchesMissingPageValue(logicalType, condition.operator, condition.value)
    ? anyOf([frag`(${cell} IS NULL)`, compared])
    : allOf([frag`(${cell} IS NOT NULL)`, compared]);
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
