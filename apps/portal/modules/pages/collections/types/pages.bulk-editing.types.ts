import type { PagePropertyValue } from './pages.schema.types';

export interface PagesBulkEditing {
  readonly duplicateRows: (rowIds: readonly string[]) => void;
  readonly isWorking: boolean;
  readonly setPropertyOnRows: (rowIds: readonly string[], propertyKey: string, value: PagePropertyValue) => void;
  readonly trashRows: (rowIds: readonly string[]) => void;
}
