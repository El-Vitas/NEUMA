import type { DatabaseViewType } from '@neuma/db';
import { pageViewRequiresGrouping, Result } from '@neuma/shared';
import type {
  SchemaGroupableRow,
  SchemaPropertyDefinition,
  SchemaRowBand,
  SchemaRowGroup,
} from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';
import { groupRowsForView } from './schema-view-grouping.domain';

const readSubGroupKey = (configuration: Readonly<Record<string, unknown>>): string | null => {
  const subGroupBy = configuration.subGroupBy;
  return typeof subGroupBy === 'string' ? subGroupBy : null;
};

/** Every band repeats all columns, even empty ones, so columns stay aligned and empty cells remain drop targets. */
const emptyColumns = <TRow extends SchemaGroupableRow>(
  columns: readonly SchemaRowGroup<TRow>[],
): SchemaRowGroup<TRow>[] => columns.map((column) => ({ ...column, rows: [] as TRow[] }));

/** One band per second-grouping value; each band offers the same columns as an unbanded board. */
export const bandRowsForView = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows?: (left: TRow, right: TRow) => number,
): Result<readonly SchemaRowBand<TRow>[], SchemaViewValidationError> => {
  // Only views that always group can band; a table draws a single dimension.
  if (!pageViewRequiresGrouping(viewType))
    return Result.fail(new SchemaViewValidationError('View does not lay its rows in bands'));
  const subGroupKey = readSubGroupKey(configuration);
  if (subGroupKey === null) return Result.fail(new SchemaViewValidationError('View has no second grouping'));
  const bands = groupRowsForView(viewType, { groupBy: subGroupKey }, properties, rows, compareRows);
  if (bands.isFail()) return Result.fail(bands.getError());
  const columns = groupRowsForView(viewType, configuration, properties, rows, compareRows);
  if (columns.isFail()) return Result.fail(columns.getError());
  const emptyBandColumns = emptyColumns(columns.getValue());
  return Result.ok(
    bands.getValue().map((band) => {
      const banded = groupRowsForView(viewType, configuration, properties, band.rows, compareRows);
      return {
        color: band.color,
        groups: banded.isFail() ? emptyBandColumns : banded.getValue(),
        key: band.key,
        label: band.label,
      };
    }),
  );
};
