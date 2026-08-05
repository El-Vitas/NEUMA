import { DatabaseViewType } from '@company-brain/db';
import type { SchemaPropertyDefinition, SchemaViewDefinition } from '../../../common/domain/schema.domain.types';
import { groupRowsByBoard } from '../../../common/domain/schema-view-grouping.domain';
import type { PageViewOutcome, PageViewRow } from './page-view.domain.types';

const toGroupableRow = (row: PageViewRow) => ({ ...row, propertyValues: row.propertyValues ?? {} });

export const buildPageViewOutcome = (
  view: SchemaViewDefinition,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly PageViewRow[],
): PageViewOutcome => {
  if (view.type !== DatabaseViewType.BOARD) return { kind: 'TABLE_ROWS', rows };
  const grouped = groupRowsByBoard(view.type, view.configuration, properties, rows.map(toGroupableRow));
  return grouped.isFail()
    ? { kind: 'BOARD_MISSING_GROUPING_PROPERTY' }
    : { kind: 'BOARD_COLUMNS', columns: grouped.getValue() };
};
