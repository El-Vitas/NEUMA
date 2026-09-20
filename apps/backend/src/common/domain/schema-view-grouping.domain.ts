import { DatabasePropertyType, type DatabaseViewType } from '@company-brain/db';
import type { PageDateBucket } from '@company-brain/shared';
import {
  canPagePropertyGroupBoard,
  PAGE_DATE_BUCKET,
  PAGE_DATE_BUCKET_VALUES,
  pageViewSupportsGrouping,
  Result,
  readPageDateBucketKey,
  UNASSIGNED_GROUP_KEY,
} from '@company-brain/shared';
import type {
  SchemaGroupableRow,
  SchemaOrderedRow,
  SchemaPropertyDefinition,
  SchemaRowGroup,
} from './schema.domain.types';
import { SchemaViewValidationError } from './schema.error';
import { UNASSIGNED_GROUP_LABEL } from './schema-view.constants';

const getGroupKey = (configuration: Readonly<Record<string, unknown>>): string | null => {
  const groupBy = configuration.groupBy;
  return typeof groupBy === 'string' ? groupBy : null;
};

const getDateBucket = (configuration: Readonly<Record<string, unknown>>): PageDateBucket => {
  const bucket = configuration.groupByDateBucket;
  return PAGE_DATE_BUCKET_VALUES.find((candidate) => candidate === bucket) ?? PAGE_DATE_BUCKET.DAY;
};

const findGroupingProperty = (
  properties: readonly SchemaPropertyDefinition[],
  groupKey: string,
): SchemaPropertyDefinition | null => {
  const property = properties.find((candidate) => candidate.key === groupKey);
  return property !== undefined && canPagePropertyGroupBoard(property.type) ? property : null;
};

/**
 * Cómo se lee un valor puesto en una fila para saber a qué columna va.
 *
 * Las columnas se nombran con texto, así que un número o una casilla se leen
 * como el texto que son. Lo que no responde nada no nombra columna: eso lo
 * decide después quien reparte, y va a la de las filas sin valor.
 */
const readGroupKeyFrom = (value: unknown): null | string => {
  if (typeof value === 'string') return value === '' ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

/**
 * El nombre del grupo al que va una fila, que en una fecha es el del tramo.
 *
 * Agrupar por fecha sin tramo es un grupo por día, y eso está bien para una
 * semana de trabajo y no para un año. El tramo solo cambia cómo se reparten:
 * lo que la fila guarda sigue siendo el día exacto.
 */
const readGroupKeyOf = (property: SchemaPropertyDefinition, bucket: PageDateBucket, value: unknown): null | string => {
  const named = readGroupKeyFrom(value);
  if (named === null || property.type !== DatabasePropertyType.DATE) return named;
  return readPageDateBucketKey(named, bucket);
};

/**
 * Las columnas que ofrece una propiedad que no declara sus valores.
 *
 * Una selección dice de antemano qué opciones hay, y sus columnas salen de
 * ahí aunque estén vacías. Una fecha o un número no: nadie declaró qué días
 * existen, así que las columnas son las que las filas nombran, en orden y sin
 * repetirse. Una casilla es el caso intermedio: solo tiene dos respuestas
 * posibles, y las dos se ofrecen aunque nadie las haya dado todavía.
 */
const listUndeclaredGroupKeys = (
  property: SchemaPropertyDefinition,
  bucket: PageDateBucket,
  rows: readonly SchemaGroupableRow[],
): readonly string[] => {
  if (property.type === DatabasePropertyType.CHECKBOX) return ['true', 'false'];
  const named = new Set<string>();
  for (const row of rows) {
    const key = readGroupKeyOf(property, bucket, row.propertyValues[property.key]);
    if (key !== null) named.add(key);
  }
  return [...named].sort((left, right) => left.localeCompare(right));
};

export const compareRowsByOrder = (left: SchemaOrderedRow, right: SchemaOrderedRow): number =>
  left.order - right.order || left.id.localeCompare(right.id);

/**
 * The rows of a view gathered by the value they carry, one group per option the
 * grouping property offers, plus one for whoever carries no value at all.
 *
 * Every option gets its group even when nothing landed in it, because an empty
 * column that exists is a place to drop something and an absent one is not.
 */
export const groupRowsForView = <TRow extends SchemaGroupableRow>(
  viewType: DatabaseViewType,
  configuration: Readonly<Record<string, unknown>>,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
  compareRows: (left: TRow, right: TRow) => number = compareRowsByOrder,
): Result<readonly SchemaRowGroup<TRow>[], SchemaViewValidationError> => {
  /** Que pueda agrupar, no que tenga que: una tabla agrupa solo cuando se lo piden, y agrupa igual. */
  if (!pageViewSupportsGrouping(viewType))
    return Result.fail(new SchemaViewValidationError('View does not read its rows in groups'));
  const groupKey = getGroupKey(configuration);
  if (groupKey === null) return Result.fail(new SchemaViewValidationError('groupBy must name a property'));
  const property = findGroupingProperty(properties, groupKey);
  if (property === null) {
    return Result.fail(new SchemaViewValidationError('groupBy must reference a property that can make groups'));
  }
  const bucket = getDateBucket(configuration);
  const groups =
    property.options === null
      ? listUndeclaredGroupKeys(property, bucket, rows).map((key) => ({
          color: null,
          key,
          label: key,
          rows: [] as TRow[],
        }))
      : property.options.map((option) => ({
          color: option.color,
          key: option.value,
          label: option.value,
          rows: [] as TRow[],
        }));
  const unassigned = { color: null, key: UNASSIGNED_GROUP_KEY, label: UNASSIGNED_GROUP_LABEL, rows: [] as TRow[] };
  const groupsByKey = new Map(groups.map((group) => [group.key, group]));
  for (const row of [...rows].sort(compareRows)) {
    const value = readGroupKeyOf(property, bucket, row.propertyValues[groupKey]);
    const group = value === null ? undefined : groupsByKey.get(value);
    (group ?? unassigned).rows.push(row);
  }
  return Result.ok([...groups, unassigned]);
};
