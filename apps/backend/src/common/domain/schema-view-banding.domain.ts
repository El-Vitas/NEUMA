import type { DatabaseViewType } from '@company-brain/db';
import { Result } from '@company-brain/shared';
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

/**
 * Las mismas columnas, vacías, para una banda que todavía no sabe qué lleva.
 *
 * Cada banda repite todas las columnas aunque no le haya tocado nada en
 * algunas: es lo que las mantiene alineadas de una banda a la siguiente, y lo
 * que hace que el cruce vacío siga siendo un sitio donde soltar.
 */
const emptyColumns = <TRow extends SchemaGroupableRow>(
  columns: readonly SchemaRowGroup<TRow>[],
): SchemaRowGroup<TRow>[] => columns.map((column) => ({ ...column, rows: [] as TRow[] }));

/**
 * Las filas de un tablero puestas en rejilla: una banda por valor de la segunda
 * agrupación, y dentro de cada banda una columna por valor de la primera.
 *
 * Las dos dimensiones se arman con la misma operación que arma un tablero de
 * una sola: agrupar es agrupar, y lo único que cambia es por qué propiedad. Así
 * una banda ofrece exactamente las mismas columnas que el tablero sin bandas, y
 * nada que dibuje columnas tiene que aprender dos formas de leerlas.
 */
export const bandRowsForView = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows?: (left: TRow, right: TRow) => number,
): Result<readonly SchemaRowBand<TRow>[], SchemaViewValidationError> => {
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
