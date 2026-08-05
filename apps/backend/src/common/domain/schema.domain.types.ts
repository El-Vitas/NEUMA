import type { DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';

export type SchemaPropertyValue = string | number | boolean | readonly string[];
export type SchemaPropertyValues = Readonly<Record<string, SchemaPropertyValue>>;

export interface SchemaPropertyDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: DatabasePropertyType;
  readonly required: boolean;
  readonly options: readonly string[] | null;
}

export interface SchemaViewDefinition {
  readonly name: string;
  readonly type: DatabaseViewType;
  readonly configuration: Prisma.InputJsonObject;
  readonly isDefault: boolean;
}

export interface SchemaGroupableRow {
  readonly id: string;
  readonly order: number;
  readonly propertyValues: SchemaPropertyValues;
}

export interface SchemaBoardColumn<TRow extends SchemaGroupableRow> {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly TRow[];
}
