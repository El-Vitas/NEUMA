import type { z } from 'zod';
import type {
  databasePropertySchema,
  databaseRecordSchema,
  databaseSummarySchema,
  databaseViewSchema,
} from '../schemas/databases.schemas';

export type DatabaseProperty = z.infer<typeof databasePropertySchema>;
export type DatabaseRecord = z.infer<typeof databaseRecordSchema>;
export type DatabaseSummary = z.infer<typeof databaseSummarySchema>;
export type DatabaseView = z.infer<typeof databaseViewSchema>;
export type DatabaseTemplate = DatabaseSummary['template'];
export interface DatabaseSpaceOption {
  readonly id: string;
  readonly name: string;
}

export interface DatabaseBoardColumn {
  readonly key: string;
  readonly label: string;
  readonly records: readonly DatabaseRecord[];
}
