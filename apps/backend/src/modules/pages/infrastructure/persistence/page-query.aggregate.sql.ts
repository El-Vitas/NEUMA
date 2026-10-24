import type { PageQueryAggregationItem } from '@neuma/shared';
import { PAGE_VIEW_CALCULATION } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../../common/domain/schema.domain.types';
import { COUNT_ALL } from '../../constants/page-query.sql.constants';
import type { CellContext, SqlFragment } from '../../types/page-query.sql.types';
import { cellOf, isEmptyCell, numberOf } from './page-query.cell.sql';
import { frag, joinSql, negate, sqlText } from './page-query.sql.lib';

const overProperty = (
  item: PageQueryAggregationItem,
  property: SchemaPropertyDefinition,
  context: CellContext,
): SqlFragment | null => {
  const cell = cellOf(property, context);
  switch (item.calculation) {
    case PAGE_VIEW_CALCULATION.COUNT_FILLED:
      return frag`count(*) FILTER (WHERE ${negate(isEmptyCell(property, cell))})`;
    case PAGE_VIEW_CALCULATION.COUNT_EMPTY:
      return frag`count(*) FILTER (WHERE ${isEmptyCell(property, cell)})`;
    case PAGE_VIEW_CALCULATION.PERCENT_FILLED:
      return frag`(count(*) FILTER (WHERE ${negate(isEmptyCell(property, cell))}))::numeric / NULLIF(count(*), 0)`;
    case PAGE_VIEW_CALCULATION.PERCENT_EMPTY:
      return frag`(count(*) FILTER (WHERE ${isEmptyCell(property, cell)}))::numeric / NULLIF(count(*), 0)`;
    case PAGE_VIEW_CALCULATION.SUM:
      return frag`sum(${numberOf(cell)})`;
    case PAGE_VIEW_CALCULATION.AVERAGE:
      return frag`avg(${numberOf(cell)})`;
    case PAGE_VIEW_CALCULATION.MINIMUM:
      return frag`min(${numberOf(cell)})`;
    case PAGE_VIEW_CALCULATION.MAXIMUM:
      return frag`max(${numberOf(cell)})`;
    case PAGE_VIEW_CALCULATION.MEDIAN:
      return frag`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${numberOf(cell)})`;
    case PAGE_VIEW_CALCULATION.PERCENT_CHECKED:
      return frag`(count(*) FILTER (WHERE ${cell} = 'true'::jsonb))::numeric / NULLIF(count(*), 0)`;
    default:
      return null;
  }
};

/**
 * The aggregate an item asks for, over the rows the query lets through, or null when there is nothing to say
 * (no calculation, an unknown property). A calculation is read as text so a sum in `numeric` loses no digit.
 */
export const aggregateSql = (
  item: PageQueryAggregationItem,
  properties: ReadonlyMap<string, SchemaPropertyDefinition>,
  context: CellContext,
): SqlFragment | null => {
  if (item.calculation === PAGE_VIEW_CALCULATION.NONE) return null;
  if (item.propertyKey === null) {
    return item.calculation === PAGE_VIEW_CALCULATION.COUNT_ALL ? COUNT_ALL : null;
  }
  if (item.calculation === PAGE_VIEW_CALCULATION.COUNT_ALL) return COUNT_ALL;
  const property = properties.get(item.propertyKey);
  return property === undefined ? null : overProperty(item, property, context);
};

const aggregateAlias = (index: number): SqlFragment => sqlText(`"a${String(index)}"`);

export const aggregateColumnsSql = (
  aggregates: readonly { readonly id: string; readonly sql: SqlFragment }[],
): SqlFragment =>
  joinSql(
    aggregates.map((aggregate, index) => frag`(${aggregate.sql})::text AS ${aggregateAlias(index)}`),
    ', ',
  );
