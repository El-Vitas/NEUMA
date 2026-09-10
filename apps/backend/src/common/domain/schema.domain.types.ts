import type { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';
import type { PageOptionColor, PagePropertyOption, PagePropertyValue, PagePropertyValues } from '@company-brain/shared';

export type SchemaPropertyValue = PagePropertyValue;
export type SchemaPropertyValues = PagePropertyValues;

export interface SchemaPropertyDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: DatabasePropertyType;
  readonly required: boolean;
  readonly options: readonly PagePropertyOption[] | null;
}

export interface SchemaViewDefinition {
  readonly name: string;
  readonly type: DatabaseViewType;
  readonly configuration: Prisma.InputJsonObject;
  readonly isDefault: boolean;
}

export interface SchemaOrderedRow {
  readonly id: string;
  readonly order: number;
}

export interface SchemaGroupableRow extends SchemaOrderedRow {
  readonly propertyValues: SchemaPropertyValues;
}

export interface SchemaRowGroup<TRow extends SchemaGroupableRow> {
  readonly color: PageOptionColor | null;
  readonly key: string;
  readonly label: string;
  readonly rows: readonly TRow[];
}

/** Una franja que cruza todas las columnas, con lo que a cada una le toca dentro de ella. */
export interface SchemaRowBand<TRow extends SchemaGroupableRow> {
  readonly color: PageOptionColor | null;
  readonly groups: readonly SchemaRowGroup<TRow>[];
  readonly key: string;
  readonly label: string;
}
