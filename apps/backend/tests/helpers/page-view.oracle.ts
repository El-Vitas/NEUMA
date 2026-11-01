import type { PageViewConfiguration } from '@neuma/shared';
import { comparePageRowsBySorts, matchesPageFilter } from '@neuma/shared';
import type { SchemaPropertyDefinition, SchemaPropertyValues } from '../../src/common/domain/schema.domain.types';

interface OracleRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues | null;
}

/**
 * The shared engine applied in memory: what a view reads when nothing is done in the database. The SQL of a query
 * must agree with it, row for row, so the tests compare the two.
 */
export const listPageViewRowsInReadingOrder = <TRow extends OracleRow>(
  configuration: PageViewConfiguration,
  properties: readonly SchemaPropertyDefinition[],
  rows: readonly TRow[],
): readonly TRow[] => {
  const { filter } = configuration;
  const selected =
    filter === null ? rows : rows.filter((row) => matchesPageFilter(filter, row.propertyValues ?? {}, properties));
  return [...selected].sort((left, right) => {
    const bySorts = comparePageRowsBySorts(
      configuration.sorts,
      left.propertyValues ?? {},
      right.propertyValues ?? {},
      properties,
    );
    return bySorts === 0 ? left.order - right.order || left.id.localeCompare(right.id) : bySorts;
  });
};
