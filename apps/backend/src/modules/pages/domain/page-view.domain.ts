import type { PageViewConfiguration } from '@company-brain/shared';
import {
  comparePageRowsBySorts,
  matchesPageFilter,
  pageViewRequiresGrouping,
  readPageViewConfiguration,
} from '@company-brain/shared';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../../common/domain/schema.domain.types';
import { compareRowsByOrder, groupRowsByBoard } from '../../../common/domain/schema-view-grouping.domain';
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

export const buildPageViewOutcome = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly PageViewRow[],
): PageViewOutcome => {
  const configuration = readPageViewConfiguration(view.configuration);
  const selectedRows = selectRows(configuration, properties, rows);
  const compareRows = createRowComparator(configuration, properties);
  if (!pageViewRequiresGrouping(view.type)) return { kind: 'TABLE_ROWS', rows: [...selectedRows].sort(compareRows) };
  const grouped = groupRowsByBoard(
    view.type,
    view.configuration,
    properties,
    selectedRows.map(toGroupableRow),
    (left, right) => compareRows(left, right),
  );
  return grouped.isFail()
    ? { kind: 'BOARD_MISSING_GROUPING_PROPERTY' }
    : { kind: 'BOARD_COLUMNS', columns: grouped.getValue() };
};
