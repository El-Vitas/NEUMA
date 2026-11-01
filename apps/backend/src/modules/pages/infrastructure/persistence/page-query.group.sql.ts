import { DatabasePropertyType } from '@neuma/db';
import { PAGE_DATE_BUCKET } from '@neuma/shared';
import { DATE_PREFIX_PATTERN } from '../../constants/page-query.sql.constants';
import type { GroupingPlan } from '../../domain/page-query.grouping.domain.types';
import type { CellContext, SqlFragment } from '../../types/page-query.sql.types';
import { cellOf, entriesOf, isDateCell, textOf, typeOf } from './page-query.cell.sql';
import { anyOf, frag, sqlJson, sqlParameter, sqlText, sqlTextList } from './page-query.sql.lib';

const startText = (cell: SqlFragment): SqlFragment => frag`(${cell} ->> 'start')`;

/** The group is named by its start (the day, that week's Monday, the month), so the names sort in time order. */
const dateBucketKey = (plan: GroupingPlan, cell: SqlFragment): SqlFragment => {
  const start = startText(cell);
  const day = frag`left(${start}, 10)`;
  const key = (() => {
    switch (plan.bucket) {
      case PAGE_DATE_BUCKET.WEEK:
        return frag`to_char(date_trunc('week', (${day})::date), 'YYYY-MM-DD')`;
      case PAGE_DATE_BUCKET.MONTH:
        return frag`left(${start}, 7)`;
      default:
        return day;
    }
  })();
  return frag`(CASE WHEN ${isDateCell(cell)} AND ${start} ~ ${sqlText(DATE_PREFIX_PATTERN)} THEN ${key} END)`;
};

const singleKey = (plan: GroupingPlan, cell: SqlFragment): SqlFragment => {
  switch (plan.property.type) {
    case DatabasePropertyType.CHECKBOX:
      return frag`(CASE WHEN ${typeOf(cell)} = 'boolean' THEN ${textOf(cell)} END)`;
    case DatabasePropertyType.NUMBER:
      return frag`(CASE WHEN ${typeOf(cell)} = 'number' THEN ${textOf(cell)} END)`;
    case DatabasePropertyType.DATE:
    case DatabasePropertyType.CREATED_TIME:
    case DatabasePropertyType.EDITED_TIME:
      return dateBucketKey(plan, cell);
    case DatabasePropertyType.STATUS:
      return plan.statusGroupByOption === null
        ? frag`NULLIF(${textOf(cell)}, '')`
        : frag`(${sqlJson(plan.statusGroupByOption)} ->> ${textOf(cell)})`;
    default:
      return frag`NULLIF(${textOf(cell)}, '')`;
  }
};

/** A key the property does not declare belongs to no group but the one for rows without a value. */
const declaredOrNothing = (plan: GroupingPlan, key: SqlFragment): SqlFragment =>
  plan.declaredKeys === null ? key : frag`(CASE WHEN ${key} = ANY(${sqlTextList(plan.declaredKeys)}) THEN ${key} END)`;

/**
 * Puts each row in its group or groups, as the column `"<alias>"."key"` (NULL for the group without a value).
 * A property with several values gives a row one line per value, so the row is in every group it names.
 */
export const groupJoinSql = (plan: GroupingPlan, context: CellContext, alias: string): SqlFragment => {
  const cell = cellOf(plan.property, context);
  const quoted = sqlText(`"${alias}"`);
  if (!plan.isMultiValue) {
    return frag`CROSS JOIN LATERAL (SELECT ${declaredOrNothing(plan, singleKey(plan, cell))} AS "key") AS ${quoted}`;
  }
  return frag`LEFT JOIN LATERAL (SELECT DISTINCT ${declaredOrNothing(plan, sqlText('"entry"."value"'))} AS "key" FROM ${entriesOf(cell)} AS "entry"("value")) AS ${quoted} ON TRUE`;
};

export const groupKeyOf = (alias: string): SqlFragment => sqlText(`"${alias}"."key"`);

/** Keeps the rows of the groups named, and those without a value when that group is shown too. */
export const groupInclusionSql = (alias: string, keys: readonly string[], includeUnassigned: boolean): SqlFragment =>
  anyOf([
    ...(keys.length === 0 ? [] : [frag`(${groupKeyOf(alias)} = ANY(${sqlTextList(keys)}))`]),
    ...(includeUnassigned ? [frag`(${groupKeyOf(alias)} IS NULL)`] : []),
  ]);

/** The rows in one group: the one named, or the one without a value. */
export const groupMembershipSql = (alias: string, key: string | null): SqlFragment =>
  key === null ? frag`(${groupKeyOf(alias)} IS NULL)` : frag`(${groupKeyOf(alias)} = ${sqlParameter(key, 'text')})`;
