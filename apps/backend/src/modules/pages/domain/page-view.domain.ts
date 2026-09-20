import type { PageViewConfiguration } from '@company-brain/shared';
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

/**
 * Cuántas filas quedaron a la vista, vengan repartidas como vengan.
 *
 * Se cuenta sobre lo que la vista entrega y no sobre lo que se filtró, porque
 * es lo mismo dicho donde no hay que volver a saber cómo se filtró: quien
 * reparte en grupos ya decidió qué entra.
 */
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
  /** Cuenta lo que la vista tiene puesto: una tabla lee en grupos solo si se lo pidieron. */
  if (readPageViewShape(view.type, configuration.groupBy) === PAGE_VIEW_SHAPE.FLAT)
    return { kind: 'FLAT_ROWS', rows: [...selectedRows].sort(compareRows) };
  const groupableRows = selectedRows.map(toGroupableRow);
  const compareGroupableRows = (left: GroupablePageViewRow, right: GroupablePageViewRow): number =>
    compareRows(left, right);
  /**
   * Con una segunda agrupación puesta, las filas salen en rejilla. Si esa
   * segunda no se puede armar, la vista cae al tablero de siempre en vez de
   * quedarse sin nada: una agrupación de más no puede hacer desaparecer las
   * filas.
   */
  if (configuration.subGroupBy !== null) {
    const banded = bandRowsForView(view.type, view.configuration, properties, groupableRows, compareGroupableRows);
    if (banded.isOk()) return { bands: banded.getValue(), kind: 'BANDED_ROWS' };
  }
  const grouped = groupRowsForView(view.type, view.configuration, properties, groupableRows, compareGroupableRows);
  return grouped.isFail()
    ? { kind: 'MISSING_GROUPING_PROPERTY' }
    : { groups: grouped.getValue(), kind: 'GROUPED_ROWS' };
};
