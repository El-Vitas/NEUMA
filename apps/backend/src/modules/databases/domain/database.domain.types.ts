import type { DatabaseLifecycle } from '@company-brain/db';
import type {
  SchemaPropertyDefinition,
  SchemaPropertyValue,
  SchemaPropertyValues,
  SchemaViewDefinition,
} from '../../../common/domain/schema.domain.types';

export type DatabasePropertyValue = SchemaPropertyValue;
export type DatabasePropertyValues = SchemaPropertyValues;
export type DatabasePropertyDefinition = SchemaPropertyDefinition;
export type DatabaseViewDefinition = SchemaViewDefinition;

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
