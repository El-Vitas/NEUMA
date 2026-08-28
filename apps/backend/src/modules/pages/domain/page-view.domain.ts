import type { PageViewConfiguration } from '@company-brain/shared';
import {
  comparePageRowsBySorts,
  getPageViewShape,
  matchesPageFilter,
  PAGE_VIEW_SHAPE,
  readPageViewConfiguration,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../../common/domain/schema.domain.types';
import { compareRowsByOrder, groupRowsForView } from '../../../common/domain/schema-view-grouping.domain';
import type { PageViewOutcome, PageViewRow } from './page-view.domain.types';

const toGroupableRow = (row: PageViewRow) => ({ ...row, propertyValues: row.propertyValues ?? {} });

const selectRows = (
  configuration: PageViewConfiguration,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly PageViewRow[],
): readonly PageViewRow[] => {
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

/**
 * The rows a view hands over, read the way that kind of view reads them.
 *
 * What decides is the shape the view declares, not which view it is. A gallery
 * added tomorrow reads its rows one after another like the table, and nothing
 * here has to learn its name.
 */
export const buildPageViewOutcome = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly PageViewRow[],
): PageViewOutcome => {
  const configuration = readPageViewConfiguration(view.configuration);
  const selectedRows = selectRows(configuration, properties, rows);
  const compareRows = createRowComparator(configuration, properties);
  if (getPageViewShape(view.type) === PAGE_VIEW_SHAPE.FLAT)
    return { kind: 'FLAT_ROWS', rows: [...selectedRows].sort(compareRows) };
  const grouped = groupRowsForView(
    view.type,
    view.configuration,
    properties,
    selectedRows.map(toGroupableRow),
    (left, right) => compareRows(left, right),
  );
  return grouped.isFail()
    ? { kind: 'MISSING_GROUPING_PROPERTY' }
    : { kind: 'GROUPED_ROWS', groups: grouped.getValue() };
};
