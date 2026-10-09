import type { PageFilter, PageViewConfiguration } from '@company-brain/shared';
import {
  comparePageRowsBySorts,
  matchesPageFilter,
  PAGE_VIEW_SHAPE,
  readPageViewConfiguration,
  readPageViewShape,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../../common/domain/schema.domain.types';
import { bandRowsForView } from '../../../common/domain/schema-view-banding.domain';
import { compareRowsByOrder, groupRowsForView } from '../../../common/domain/schema-view-grouping.domain';
import type { GroupablePageViewRow, PageViewOutcome, PageViewRow } from './page-view.domain.types';

const toGroupableRow = (row: PageViewRow) => ({ ...row, propertyValues: row.propertyValues ?? {} });

/** Counted on what the view hands over, not on the filter. */
export const countPageViewRows = (outcome: PageViewOutcome): number => {
  switch (outcome.kind) {
    case 'FLAT_ROWS':
      return outcome.rows.length;
    case 'GROUPED_ROWS':
      return outcome.groups.reduce((total, group) => total + group.rows.length, 0);
    case 'BANDED_ROWS':
      return outcome.bands.reduce(
        (total, band) => total + band.groups.reduce((inside, group) => inside + group.rows.length, 0),
        0,
      );
    default:
      return 0;
  }
};

const selectRows = <TRow extends PageViewRow>(
  configuration: PageViewConfiguration,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
): readonly TRow[] => {
  const filter = configuration.filter;
  if (filter === null) return rows;
  return rows.filter((row) => matchesPageFilter(filter, row.propertyValues ?? {}, properties));
};

const createRowComparator =
  (configuration: PageViewConfiguration, properties: readonly SchemaPropertyDefinition[]) =>
  (left: PageViewRow, right: PageViewRow): number => {
    const bySorts = comparePageRowsBySorts(
      configuration.sorts,
      left.propertyValues ?? {},
      right.propertyValues ?? {},
      properties,
    );
    return bySorts === 0 ? compareRowsByOrder(left, right) : bySorts;
  };

const listFilterKeys = (filter: PageFilter | null): readonly string[] => {
  if (filter === null) return [];
  return filter.kind === 'CONDITION' ? [filter.propertyKey] : filter.conditions.flatMap(listFilterKeys);
};

/** A hand-written configuration can name a missing column, and a filter on it silently empties the list. */
export const findUnknownViewColumns = (
  configuration: PageViewConfiguration,
  properties: readonly SchemaPropertyDefinition[],
): readonly string[] => {
  const known = new Set(properties.map((property) => property.key));
  const named = [
    ...listFilterKeys(configuration.filter),
    ...configuration.sorts.map((sort) => sort.propertyKey),
    ...(configuration.visibleProperties ?? []),
    configuration.groupBy,
    configuration.subGroupBy,
    configuration.dateProperty,
    configuration.chartValueProperty,
  ].filter((key): key is string => key !== null);
  return [...new Set(named.filter((key) => !known.has(key)))];
};

export const listPageViewRowsInReadingOrder = <TRow extends PageViewRow>(
  configuration: PageViewConfiguration,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
): readonly TRow[] =>
  [...selectRows(configuration, properties, rows)].sort(createRowComparator(configuration, properties));

/** Reads by the shape the view declares, not by view kind, so new view kinds need no change here. */
export const buildPageViewOutcome = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly PageViewRow[],
): PageViewOutcome => {
  const configuration = readPageViewConfiguration(view.configuration);
  const selectedRows = selectRows(configuration, properties, rows);
  const compareRows = createRowComparator(configuration, properties);
  if (readPageViewShape(view.type, configuration.groupBy) === PAGE_VIEW_SHAPE.FLAT)
    return { kind: 'FLAT_ROWS', rows: [...selectedRows].sort(compareRows) };
  const groupableRows = selectedRows.map(toGroupableRow);
  const compareGroupableRows = (left: GroupablePageViewRow, right: GroupablePageViewRow): number =>
    compareRows(left, right);
  /** Falls back to the plain board if the grid cannot be built, so an extra grouping never hides rows. */
  if (configuration.subGroupBy !== null) {
    const banded = bandRowsForView(view.type, view.configuration, properties, groupableRows, compareGroupableRows);
    if (banded.isOk()) return { bands: banded.getValue(), kind: 'BANDED_ROWS' };
  }
  const grouped = groupRowsForView(view.type, view.configuration, properties, groupableRows, compareGroupableRows);
  return grouped.isFail()
    ? { kind: 'MISSING_GROUPING_PROPERTY' }
    : { groups: grouped.getValue(), kind: 'GROUPED_ROWS' };
};
