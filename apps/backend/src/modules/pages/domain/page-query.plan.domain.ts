import { DatabasePropertyType } from '@neuma/db';
import type { PageFilter, PageQueryAggregationItem, PageSort, PageViewConfiguration } from '@neuma/shared';
import { PAGE_FILTER_GROUP_OPERATOR } from '@neuma/shared';
import type { SchemaPropertyDefinition } from '../../../common/domain/schema.domain.types';

/** The filter of the view with the temporary one on top: a row must pass both. */
export const combineFilters = (
  viewFilter: PageFilter | null,
  quickFilter: PageFilter | undefined,
): PageFilter | null => {
  if (quickFilter === undefined) return viewFilter;
  if (viewFilter === null) return quickFilter;
  return { conditions: [viewFilter, quickFilter], kind: 'GROUP', operator: PAGE_FILTER_GROUP_OPERATOR.AND };
};

const listFilterKeys = (filter: PageFilter | null): readonly string[] => {
  if (filter === null) return [];
  return filter.kind === 'CONDITION' ? [filter.propertyKey] : filter.conditions.flatMap(listFilterKeys);
};

/** The properties a query reads to decide which rows come, in what order, and what to count. */
export const listReferencedKeys = (
  filter: PageFilter | null,
  sorts: readonly PageSort[],
  items: readonly PageQueryAggregationItem[],
  configuration: PageViewConfiguration,
): ReadonlySet<string> =>
  new Set([
    ...listFilterKeys(filter),
    ...sorts.map((sort) => sort.propertyKey),
    ...items.flatMap((item) => (item.propertyKey === null ? [] : [item.propertyKey])),
    ...(configuration.groupBy === null ? [] : [configuration.groupBy]),
    ...(configuration.subGroupBy === null ? [] : [configuration.subGroupBy]),
  ]);

/** The relation properties among the keys, with the collection each points to. */
export const listRelationTargets = (
  properties: readonly SchemaPropertyDefinition[],
  keys: ReadonlySet<string>,
): ReadonlyMap<string, string | null> =>
  new Map(
    properties
      .filter((property) => property.type === DatabasePropertyType.RELATION && keys.has(property.key))
      .map((property) => [property.key, property.config.targetCollectionId]),
  );

/** A number as the database reports it in text, or null when there is nothing to say. */
export const readAggregateNumber = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
