import { DatabasePropertyType } from '@neuma/db';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import {
  DAY_PATTERN,
  EMPTINESS_BY_TYPE,
  INSTANT_PATTERN,
  ISO_INSTANT_FORMAT,
  ROW,
} from '../../constants/page-query.sql.constants';
import type { CellContext, SqlFragment } from '../../types/page-query.sql.types';
import { frag, sqlParameter, sqlText, sqlTextList } from './page-query.sql.lib';

const row = (column: string): SqlFragment => sqlText(`"${ROW}"."${column}"`);

const derivedTime = (column: string): SqlFragment =>
  frag`jsonb_build_object('start', to_char(${row(column)} AT TIME ZONE 'UTC', ${sqlText(`'${ISO_INSTANT_FORMAT}'`)}))`;

export const storedCell = (key: string): SqlFragment =>
  frag`NULLIF(${row('properties')} -> 'values' -> ${sqlParameter(key, 'text')}, 'null'::jsonb)`;

const relationCell = (property: SchemaPropertyDefinition, context: CellContext): SqlFragment => {
  const unreadable = context.unreadableRelations.get(property.key) ?? [];
  if (unreadable === 'ALL') return sqlText('NULL::jsonb');
  const stored = storedCell(property.key);
  return unreadable.length === 0 ? stored : frag`(${stored} - ${sqlTextList(unreadable)})`;
};

/**
 * What the row holds for a property, as `jsonb` (SQL NULL when it holds nothing). Values the block itself says,
 * such as who made it and when, are composed from its columns, as the shared engine does with `withPageDerivedValues`.
 */
export const cellOf = (property: SchemaPropertyDefinition, context: CellContext): SqlFragment => {
  switch (property.type) {
    case DatabasePropertyType.TITLE:
      return frag`to_jsonb(${row('text')})`;
    case DatabasePropertyType.CREATED_TIME:
      return derivedTime('createdAt');
    case DatabasePropertyType.EDITED_TIME:
      return derivedTime('editedAt');
    case DatabasePropertyType.CREATED_BY:
      return frag`to_jsonb(${row('createdById')})`;
    case DatabasePropertyType.EDITED_BY:
      return frag`to_jsonb(${row('editedById')})`;
    case DatabasePropertyType.RELATION:
      return relationCell(property, context);
    default:
      return storedCell(property.key);
  }
};

export const textOf = (cell: SqlFragment): SqlFragment => frag`(${cell} #>> '{}')`;

export const typeOf = (cell: SqlFragment): SqlFragment => frag`jsonb_typeof(${cell})`;

/** The number a cell holds, or NULL: a cell of any other kind never makes a comparison fail. */
export const numberOf = (cell: SqlFragment): SqlFragment =>
  frag`(CASE WHEN ${typeOf(cell)} = 'number' THEN (${cell})::numeric END)`;

/** The entries of a list cell as a set of texts; nothing for a cell that is not a list. */
export const entriesOf = (cell: SqlFragment): SqlFragment =>
  frag`jsonb_array_elements_text(CASE WHEN ${typeOf(cell)} = 'array' THEN ${cell} ELSE '[]'::jsonb END)`;

export const isDateCell = (cell: SqlFragment): SqlFragment =>
  frag`(${typeOf(cell)} = 'object' AND ${typeOf(frag`(${cell} -> 'start')`)} = 'string' AND (${cell} -> 'end' IS NULL OR ${typeOf(frag`(${cell} -> 'end')`)} = 'string'))`;

/** A day is the start of that day in UTC and an instant is itself, which is how `Date.parse` reads them. */
export const instantOf = (text: SqlFragment): SqlFragment =>
  frag`(CASE WHEN ${text} ~ ${sqlText(DAY_PATTERN)} THEN (${text} || 'T00:00:00Z')::timestamptz WHEN ${text} ~ ${sqlText(INSTANT_PATTERN)} THEN (${text})::timestamptz END)`;

export const dateStartOf = (cell: SqlFragment): SqlFragment =>
  frag`(CASE WHEN ${isDateCell(cell)} THEN ${instantOf(frag`(${cell} ->> 'start')`)} END)`;

export const dateEndOf = (cell: SqlFragment): SqlFragment =>
  frag`(CASE WHEN ${isDateCell(cell)} THEN ${instantOf(frag`COALESCE(${cell} ->> 'end', ${cell} ->> 'start')`)} END)`;

/** A date written without a time, which belongs to a calendar day and not to an instant. */
export const isDayCell = (cell: SqlFragment): SqlFragment => frag`((${cell} ->> 'start') ~ ${sqlText(DAY_PATTERN)})`;

/** Only for a cell that `isDateCell` and `isDayCell` accept: the first and the last day of a date. */
export const dayStartOf = (cell: SqlFragment): SqlFragment => frag`((${cell} ->> 'start')::date)`;

export const dayEndOf = (cell: SqlFragment): SqlFragment =>
  frag`(COALESCE(${cell} ->> 'end', ${cell} ->> 'start')::date)`;

/** The same meaning of empty as the shared engine: a blank text, a list with nothing, no date, or no cell at all. */
export const isEmptyCell = (property: SchemaPropertyDefinition, cell: SqlFragment): SqlFragment => {
  switch (EMPTINESS_BY_TYPE[property.type]) {
    case 'BLANK_TEXT':
      return frag`(${cell} IS NULL OR (${typeOf(cell)} = 'string' AND btrim(${textOf(cell)}) = ''))`;
    case 'EMPTY_LIST':
      return frag`(${cell} IS NULL OR (CASE WHEN ${typeOf(cell)} = 'array' THEN jsonb_array_length(${cell}) = 0 ELSE FALSE END))`;
    case 'DATE_ABSENT':
      return frag`(${cell} IS NULL OR NOT ${isDateCell(cell)})`;
    default:
      return frag`(${cell} IS NULL)`;
  }
};
