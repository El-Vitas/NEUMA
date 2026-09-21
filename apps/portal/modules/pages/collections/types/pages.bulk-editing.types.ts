import type { PagePropertyValue } from './pages.schema.types';

/** Lo que se puede hacer de una vez con varias filas marcadas. */
export interface PagesBulkEditing {
  /** Manda las copias a la papelera, que es de donde se vuelve. */
  readonly duplicateRows: (rowIds: readonly string[]) => void;
  readonly isWorking: boolean;
  /** Escribe el mismo valor en todas, y ofrece devolver cada una al suyo. */
  readonly setPropertyOnRows: (rowIds: readonly string[], propertyKey: string, value: PagePropertyValue) => void;
  readonly trashRows: (rowIds: readonly string[]) => void;
}
