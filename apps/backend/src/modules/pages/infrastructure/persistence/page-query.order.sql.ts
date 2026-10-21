import { DatabasePropertyType } from '@neuma/db';
import type { PagePropertyOption, PageSort } from '@neuma/shared';
import {
  getPagePropertyLogicalType,
  PAGE_PROPERTY_LOGICAL_TYPE,
  PAGE_SORT_DIRECTION,
  PAGE_STATUS_GROUP_VALUES,
} from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import {
  FLAG_EMPTY,
  FLAG_PRESENT,
  GROUP_RANK_WEIGHT,
  POSITION,
  ROW,
  SQL_FALSE,
  UNKNOWN_OPTION_RANK,
} from '../../constants/page-query.sql.constants';
import type { CellContext, OrderColumn, SortKey, SqlFragment } from '../../types/page-query.sql.types';
import {
  cellOf,
  dateEndOf,
  dateStartOf,
  entriesOf,
  isEmptyCell,
  numberOf,
  textOf,
  typeOf,
} from './page-query.cell.sql';
import { allOf, anyOf, frag, joinSql, sqlJson, sqlParameter, sqlText } from './page-query.sql.lib';

/**
 * Where each row stands in the manual order: the list of the view when it has one, the children of the collection
 * otherwise. A row that is not in the list has no position and goes after the ones that do.
 */
export const positionsSql = (collectionId: string, viewId: string | null): SqlFragment => {
  const list =
    viewId === null
      ? frag`(SELECT "children" FROM "Block" WHERE "id" = ${sqlParameter(collectionId, 'text')})`
      : frag`COALESCE((SELECT "manualOrder" FROM "PageSchemaView" WHERE "id" = ${sqlParameter(viewId, 'text')}), (SELECT "children" FROM "Block" WHERE "id" = ${sqlParameter(collectionId, 'text')}))`;
  return frag`"order_list" AS (SELECT "e"."id", "e"."pos" FROM unnest(${list}) WITH ORDINALITY AS "e"("id", "pos"))`;
};

export const positionJoin: SqlFragment = sqlText(
  `LEFT JOIN "order_list" AS "${POSITION}" ON "${POSITION}"."id" = "${ROW}"."id"`,
);

const hasOrderedOptions = (property: SchemaPropertyDefinition): boolean =>
  (property.options ?? []).length > 0 &&
  (property.type === DatabasePropertyType.SELECT || property.type === DatabasePropertyType.MULTI_SELECT);

const optionRanks = (options: readonly PagePropertyOption[]): Record<string, number> =>
  Object.fromEntries(options.map((option, position) => [option.id, position]));

const statusRanks = (options: readonly PagePropertyOption[]): Record<string, number> =>
  Object.fromEntries(
    options.map((option) => {
      const groupRank = option.group === null ? -1 : PAGE_STATUS_GROUP_VALUES.indexOf(option.group);
      const position = options.filter((candidate) => candidate.group === option.group).indexOf(option);
      return [option.id, groupRank * GROUP_RANK_WEIGHT + position];
    }),
  );

const rankOf = (ranks: Record<string, number>, text: SqlFragment): SqlFragment =>
  frag`COALESCE((${sqlJson(ranks)} ->> ${text})::int, ${sqlText(String(UNKNOWN_OPTION_RANK))})`;

/** The best rank among the entries of a list, as the shared engine ranks a multi select by its first option. */
const bestRankOf = (ranks: Record<string, number>, cell: SqlFragment): SqlFragment =>
  frag`COALESCE((SELECT min((${sqlJson(ranks)} ->> "entry"."value")::int) FROM ${entriesOf(cell)} AS "entry"("value")), ${sqlText(String(UNKNOWN_OPTION_RANK))})`;

const joinedEntries = (cell: SqlFragment): SqlFragment =>
  frag`COALESCE((SELECT string_agg("entry"."value", ', ' ORDER BY "entry"."position") FROM jsonb_array_elements_text(CASE WHEN ${typeOf(cell)} = 'array' THEN ${cell} ELSE '[]'::jsonb END) WITH ORDINALITY AS "entry"("value", "position")), '')`;

const keysOf = (property: SchemaPropertyDefinition, cell: SqlFragment): readonly SortKey[] => {
  if (hasOrderedOptions(property)) {
    const ranks = optionRanks(property.options ?? []);
    const expression =
      property.type === DatabasePropertyType.MULTI_SELECT ? bestRankOf(ranks, cell) : rankOf(ranks, textOf(cell));
    return [{ expression, type: 'int' }];
  }
  switch (getPagePropertyLogicalType(property.type)) {
    case PAGE_PROPERTY_LOGICAL_TYPE.TEXT:
    case PAGE_PROPERTY_LOGICAL_TYPE.TAG:
      return [{ expression: frag`COALESCE(${textOf(cell)}, '')`, type: 'text' }];
    case PAGE_PROPERTY_LOGICAL_TYPE.MULTI_TAG:
      return [{ expression: joinedEntries(cell), type: 'text' }];
    case PAGE_PROPERTY_LOGICAL_TYPE.NUMBER:
      return [{ expression: numberOf(cell), type: 'numeric' }];
    case PAGE_PROPERTY_LOGICAL_TYPE.BOOLEAN:
      return [{ expression: frag`(CASE WHEN ${cell} = 'true'::jsonb THEN 1 ELSE 0 END)`, type: 'int' }];
    case PAGE_PROPERTY_LOGICAL_TYPE.DATE:
      return [
        { expression: dateStartOf(cell), type: 'timestamptz' },
        { expression: dateEndOf(cell), type: 'timestamptz' },
      ];
    case PAGE_PROPERTY_LOGICAL_TYPE.STATUS:
      return [{ expression: rankOf(statusRanks(property.options ?? []), textOf(cell)), type: 'int' }];
    case PAGE_PROPERTY_LOGICAL_TYPE.RELATION:
      return [
        {
          expression: frag`(CASE WHEN ${typeOf(cell)} = 'array' THEN jsonb_array_length(${cell}) ELSE 0 END)`,
          type: 'int',
        },
      ];
    default:
      return [];
  }
};

/** An empty value always goes last, whatever the direction, so a flag orders before the value itself. */
const columnsOfSort = (
  sort: PageSort,
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  context: CellContext,
): readonly OrderColumn[] => {
  const property = properties.get(sort.propertyKey);
  if (property === undefined) return [];
  const cell = cellOf(property, context);
  const keys = keysOf(property, cell);
  if (keys.length === 0) return [];
  const direction = sort.direction === PAGE_SORT_DIRECTION.DESCENDING ? 'DESC' : 'ASC';
  const flag: OrderColumn = {
    direction: 'ASC',
    expression: frag`(CASE WHEN ${isEmptyCell(property, cell)} THEN ${sqlText(String(FLAG_EMPTY))} ELSE ${sqlText(String(FLAG_PRESENT))} END)`,
    type: 'int',
  };
  return [flag, ...keys.map((key) => ({ direction, expression: key.expression, type: key.type }) as const)];
};

/**
 * The full order of a query: the sorts, then the position of the row in the manual order, then when it was created
 * and its id, so the order is total and a cursor can always say where it stopped.
 */
export const buildOrderColumns = (
  sorts: readonly PageSort[],
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  context: CellContext,
): readonly OrderColumn[] => [
  ...sorts.flatMap((sort) => columnsOfSort(sort, properties, context)),
  {
    direction: 'ASC',
    expression: frag`COALESCE(${sqlText(`"${POSITION}"."pos"`)}, ${sqlText(String(UNKNOWN_OPTION_RANK))})`,
    type: 'int',
  },
  { direction: 'ASC', expression: sqlText(`"${ROW}"."createdAt"`), type: 'timestamptz' },
  { direction: 'ASC', expression: sqlText(`"${ROW}"."id"`), type: 'text' },
];

export const orderBySql = (columns: readonly OrderColumn[]): SqlFragment =>
  joinSql(
    columns.map((column) => frag`${column.expression} ${sqlText(column.direction)} NULLS LAST`),
    ', ',
  );

/** The values of the order columns of a row, as text, which is how a cursor carries them. */
export const orderValuesSql = (columns: readonly OrderColumn[]): SqlFragment =>
  joinSql(
    columns.map((column, index) => frag`(${column.expression})::text AS ${sqlText(`"k${String(index)}"`)}`),
    ', ',
  );

const sameAs = (column: OrderColumn, value: string | null): SqlFragment =>
  value === null
    ? frag`(${column.expression} IS NULL)`
    : frag`(${column.expression} = ${sqlParameter(value, column.type)})`;

const comesAfter = (column: OrderColumn, value: string | null): SqlFragment => {
  if (value === null) return SQL_FALSE;
  const comparison = column.direction === 'ASC' ? '>' : '<';
  return anyOf([
    frag`(${column.expression} ${sqlText(comparison)} ${sqlParameter(value, column.type)})`,
    frag`(${column.expression} IS NULL)`,
  ]);
};

/** The rows that come after the one a cursor describes, in the order of the columns. */
export const afterCursorSql = (columns: readonly OrderColumn[], values: readonly (string | null)[]): SqlFragment =>
  anyOf(
    columns.map((column, index) =>
      allOf([
        ...columns.slice(0, index).map((earlier, position) => sameAs(earlier, values[position] ?? null)),
        comesAfter(column, values[index] ?? null),
      ]),
    ),
  );
