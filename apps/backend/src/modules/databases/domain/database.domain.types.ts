import type { DatabaseLifecycle, DatabasePropertyType, DatabaseViewType } from '@company-brain/db';
import type { Prisma } from '@company-brain/db/generated';

export type DatabasePropertyValue = string | number | boolean | readonly string[];
export type DatabasePropertyValues = Readonly<Record<string, DatabasePropertyValue>>;

export interface DatabasePropertyDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: DatabasePropertyType;
  readonly required: boolean;
  readonly options: readonly string[] | null;
}

export interface DatabaseViewDefinition {
  readonly name: string;
  readonly type: DatabaseViewType;
  readonly configuration: Prisma.InputJsonObject;
  readonly isDefault: boolean;
}

export interface DatabaseRecordSummary {
  readonly id: string;
  readonly databaseId: string;
  readonly title: string;
  readonly propertyValues: DatabasePropertyValues;
  readonly order: number;
  readonly lifecycle: DatabaseLifecycle;
}

export interface DatabaseBoardColumn {
  readonly key: string;
  readonly label: string;
  readonly records: readonly DatabaseRecordSummary[];
}
